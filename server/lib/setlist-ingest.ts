import { ensureArtistImageUrl } from './artist-photos';
import { createSupabaseAdminClient } from './supabase';
import { normalizePlaceName } from './setlistfm-link-logic';
import {
  flattenSetlistSongs,
  getSetlistFmProvider,
  parseSetlistFmEventDate,
  parseSetlistFmLocalDate,
  resolveArtistMbid,
  resolveSetlistFmVenueTimezone,
  type SetlistFmProvider,
  type SetlistFmSetlist,
} from './providers/setlistfm';

type ArtistRow = {
  id: string;
  name: string;
  mbid: string | null;
  image_url: string | null;
};

export type SetlistIngestOptions = {
  pages?: number;
  maxSetlists?: number;
};

export type SetlistIngestResult = {
  artist_id: string;
  artist_name: string;
  resolved_mbid: string;
  mbid_updated: boolean;
  pages_fetched: number;
  setlists_processed: number;
  shows_upserted: number;
  shows_with_tour: number;
  songs_upserted: number;
  show_songs_inserted: number;
  skipped: number;
};

export async function ingestArtistSetlists(
  artistId: string,
  options: SetlistIngestOptions = {}
): Promise<SetlistIngestResult> {
  const pages = options.pages ?? 3;
  const maxSetlists = options.maxSetlists ?? 30;
  const supabase = createSupabaseAdminClient();
  const provider = getSetlistFmProvider();

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name, mbid, image_url')
    .eq('id', artistId)
    .maybeSingle();

  if (artistError) throw artistError;
  if (!artist) throw new Error(`Artist not found: ${artistId}`);

  const artistRow = artist as ArtistRow;
  const resolvedMbid = await resolveArtistMbid({
    dbMbid: artistRow.mbid,
    artistName: artistRow.name,
    searchArtistsByName: (name) => provider.searchArtistsByName(name),
  });

  let mbidUpdated = false;
  if (!artistRow.mbid) {
    const { error: updateMbidError } = await supabase
      .from('artists')
      .update({ mbid: resolvedMbid })
      .eq('id', artistRow.id);
    if (updateMbidError) throw updateMbidError;
    mbidUpdated = true;
  }

  await ensureArtistImageUrl({
    id: artistRow.id,
    name: artistRow.name,
    image_url: artistRow.image_url,
  });

  const setlists: SetlistFmSetlist[] = [];
  let page = 1;
  for (; page <= pages; page += 1) {
    const batch = await provider.getArtistSetlists(resolvedMbid, page);
    if (batch.length === 0) break;
    setlists.push(...batch);
    if (setlists.length >= maxSetlists) break;
  }

  const limitedSetlists = setlists.slice(0, maxSetlists);
  const pagesFetched = limitedSetlists.length === 0 ? 0 : page;

  let showsUpserted = 0;
  let showsWithTour = 0;
  let songsUpserted = 0;
  let showSongsInserted = 0;
  let skipped = 0;

  for (const setlist of limitedSetlists) {
    try {
      const stats = await ingestSetlistEntry(supabase, artistRow.id, setlist, provider);
      showsUpserted += stats.showUpserted ? 1 : 0;
      showsWithTour += stats.tourLinked ? 1 : 0;
      songsUpserted += stats.songsUpserted;
      showSongsInserted += stats.showSongsInserted;
    } catch {
      skipped += 1;
    }
  }

  return {
    artist_id: artistRow.id,
    artist_name: artistRow.name,
    resolved_mbid: resolvedMbid,
    mbid_updated: mbidUpdated,
    pages_fetched: pagesFetched,
    setlists_processed: limitedSetlists.length,
    shows_upserted: showsUpserted,
    shows_with_tour: showsWithTour,
    songs_upserted: songsUpserted,
    show_songs_inserted: showSongsInserted,
    skipped,
  };
}

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type ExistingShowRow = {
  id: string;
  tour_id: string | null;
  venue_id: string;
  show_date: string;
  setlistfm_id: string | null;
};

function normalizeCityName(city: string): string {
  return normalizePlaceName(city);
}

function hasCustomShowTime(isoDate: string): boolean {
  const date = new Date(isoDate);
  return !(date.getUTCHours() === 12 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0);
}

export type IngestSetlistEntryOptions = {
  suppressEnrichHook?: boolean;
  logTimings?: boolean;
};

export async function ingestSetlistEntry(
  supabase: SupabaseAdmin,
  artistId: string,
  setlist: SetlistFmSetlist,
  provider: SetlistFmProvider,
  options: IngestSetlistEntryOptions = {}
) {
  let stepStart = Date.now();
  const tourName = await resolveTourName(setlist, provider);
  const setlistFmMs = Date.now() - stepStart;

  stepStart = Date.now();
  const venueId = await upsertVenue(supabase, setlist);
  const tourId = await upsertTour(supabase, artistId, tourName, setlist.eventDate);
  const showDate = parseSetlistFmEventDate(setlist.eventDate);
  const localDate = parseSetlistFmLocalDate(setlist.eventDate);
  const showId = await upsertShow(supabase, {
    artistId,
    tourId,
    venueId,
    showDate,
    localDate,
    setlistfmId: setlist.id,
  });
  const venueMs = Date.now() - stepStart;

  if (!options.suppressEnrichHook) {
    void scheduleEnrichForIngestedShow(supabase, showId);
  }

  const parsedSongs = flattenSetlistSongs(setlist);
  if (parsedSongs.length === 0) {
    if (options.logTimings) {
      console.info(
        `[setlist-ingest] setlist=${setlist.id} setlist.fm=${setlistFmMs}ms venue=${venueMs}ms songs=0ms (no songs)`
      );
    }
    return {
      showUpserted: Boolean(showId),
      tourLinked: Boolean(tourId),
      songsUpserted: 0,
      showSongsInserted: 0,
    };
  }

  stepStart = Date.now();
  await supabase.from('show_songs').delete().eq('show_id', showId);

  let songsUpserted = 0;
  let showSongsInserted = 0;

  for (const item of parsedSongs) {
    const songId = await upsertSong(supabase, artistId, item.title);
    songsUpserted += 1;

    const { error } = await supabase.from('show_songs').insert({
      show_id: showId,
      song_id: songId,
      position: item.position,
      is_encore: item.is_encore,
      notes: item.notes,
    });

    if (error) throw error;
    showSongsInserted += 1;
  }

  const songsMs = Date.now() - stepStart;
  if (options.logTimings) {
    console.info(
      `[setlist-ingest] setlist=${setlist.id} setlist.fm=${setlistFmMs}ms venue=${venueMs}ms songs=${songsMs}ms`
    );
  }

  return { showUpserted: true, tourLinked: Boolean(tourId), songsUpserted, showSongsInserted };
}

export async function writeSetlistSongsForShow(
  supabase: SupabaseAdmin,
  showId: string,
  artistId: string,
  setlist: SetlistFmSetlist
): Promise<number> {
  const parsedSongs = flattenSetlistSongs(setlist);
  await supabase.from('show_songs').delete().eq('show_id', showId);

  if (parsedSongs.length === 0) return 0;

  let inserted = 0;
  for (const item of parsedSongs) {
    const songId = await upsertSong(supabase, artistId, item.title);
    const { error } = await supabase.from('show_songs').insert({
      show_id: showId,
      song_id: songId,
      position: item.position,
      is_encore: item.is_encore,
      notes: item.notes,
    });
    if (error) throw error;
    inserted += 1;
  }

  return inserted;
}

export async function attachSetlistToShow(
  supabase: SupabaseAdmin,
  params: {
    showId: string;
    artistId: string;
    setlist: SetlistFmSetlist;
    provider: SetlistFmProvider;
    suppressEnrichHook?: boolean;
  }
): Promise<{ showId: string; songsInserted: number }> {
  const tourName = await resolveTourName(params.setlist, params.provider);
  const venueId = await upsertVenueFromSetlist(supabase, params.setlist);
  const tourId = await upsertTour(supabase, params.artistId, tourName, params.setlist.eventDate);
  const showDate = parseSetlistFmEventDate(params.setlist.eventDate);
  const localDate = parseSetlistFmLocalDate(params.setlist.eventDate);

  const { data: existingShow, error: showError } = await supabase
    .from('shows')
    .select('id, show_date, venue_id, source')
    .eq('id', params.showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!existingShow) throw new Error(`Show not found: ${params.showId}`);

  const previousVenueId = existingShow.venue_id as string | null;

  const updatePayload: Record<string, unknown> = {
    setlistfm_id: params.setlist.id,
    tour_id: tourId,
    venue_id: venueId,
    local_date: localDate,
    time_confirmed: false,
    source: 'setlistfm',
  };

  if (!hasCustomShowTime(existingShow.show_date as string)) {
    updatePayload.show_date = showDate;
  }

  const { error: updateError } = await supabase
    .from('shows')
    .update(updatePayload)
    .eq('id', params.showId);

  if (updateError) throw updateError;

  if (previousVenueId && previousVenueId !== venueId) {
    const { count, error: countError } = await supabase
      .from('shows')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', previousVenueId);

    if (!countError && (count ?? 0) <= 1) {
      await supabase.from('venues').delete().eq('id', previousVenueId);
    }
  }

  const songsInserted = await writeSetlistSongsForShow(
    supabase,
    params.showId,
    params.artistId,
    params.setlist
  );

  if (!params.suppressEnrichHook) {
    void scheduleEnrichForIngestedShow(supabase, params.showId);
  }

  return { showId: params.showId, songsInserted };
}

async function scheduleEnrichForIngestedShow(
  supabase: SupabaseAdmin,
  showId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('shows')
    .select('id, show_date, local_date, time_confirmed, venue:venues ( timezone )')
    .eq('id', showId)
    .maybeSingle();

  if (error || !data) return;

  const venue = Array.isArray(data.venue) ? data.venue[0] : data.venue;
  const { isShowActive } = await import('./visibility');
  if (
    !isShowActive({
      show_date: data.show_date as string,
      local_date: data.local_date as string | undefined,
      time_confirmed: data.time_confirmed as boolean | undefined,
      venue: venue as { timezone?: string | null } | undefined,
    })
  ) {
    return;
  }

  const { startEnrichShowInBackground } = await import('./enrich-show-runner');
  startEnrichShowInBackground(showId);
}

async function resolveTourName(
  setlist: SetlistFmSetlist,
  provider: SetlistFmProvider
): Promise<string | null> {
  const fromList = setlist.tour?.name?.trim();
  if (fromList) return fromList;

  // Artist setlist pages often omit `tour`; fetch the full setlist when needed.
  const full = await provider.getSetlist(setlist.id);
  return full.tour?.name?.trim() || null;
}

export async function upsertVenueFromSetlist(
  supabase: SupabaseAdmin,
  setlist: SetlistFmSetlist
): Promise<string> {
  const venue = setlist.venue;
  const city = venue.city.name;
  const country = venue.city.country.name;
  const normalizedCity = normalizeCityName(city);
  const setlistfmVenueId = venue.id?.trim() || null;

  if (setlistfmVenueId) {
    const { data: bySetlistId, error: byIdError } = await supabase
      .from('venues')
      .select('id')
      .eq('setlistfm_venue_id', setlistfmVenueId)
      .maybeSingle();

    if (byIdError) throw byIdError;
    if (bySetlistId?.id) return bySetlistId.id as string;
  }

  const { data: candidates, error: findError } = await supabase
    .from('venues')
    .select('id, city')
    .eq('name', venue.name)
    .eq('country', country);

  if (findError) throw findError;

  const existing = (candidates ?? []).find(
    (row) => normalizeCityName((row.city as string | null) ?? '') === normalizedCity
  );
  if (existing?.id) {
    if (setlistfmVenueId) {
      await supabase
        .from('venues')
        .update({ setlistfm_venue_id: setlistfmVenueId })
        .eq('id', existing.id)
        .is('setlistfm_venue_id', null);
    }
    return existing.id as string;
  }

  const lat = venue.city.coords?.lat ?? null;
  const lng = venue.city.coords?.long ?? null;
  const timezone = resolveSetlistFmVenueTimezone({
    city,
    countryName: country,
    countryCode: venue.city.country.code,
    stateCode: venue.city.stateCode ?? venue.city.state,
  });

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: venue.name,
      city,
      country,
      lat,
      lng,
      capacity: null,
      timezone,
      setlistfm_venue_id: setlistfmVenueId,
    })
    .select('id')
    .single();

  if (error) throw error;
  const venueId = data.id as string;

  const { geocodeVenueById } = await import('./venue-geocode');
  await geocodeVenueById(supabase, venueId).catch(() => undefined);

  return venueId;
}

async function upsertVenue(supabase: SupabaseAdmin, setlist: SetlistFmSetlist): Promise<string> {
  return upsertVenueFromSetlist(supabase, setlist);
}

async function upsertTour(
  supabase: SupabaseAdmin,
  artistId: string,
  tourName: string | null,
  eventDate: string
): Promise<string | null> {
  if (!tourName) return null;

  const name = tourName;
  const [, month, year] = eventDate.split('-').map(Number);
  const tourYear = year || new Date().getUTCFullYear();
  void month;

  const { data: existing, error: findError } = await supabase
    .from('tours')
    .select('id')
    .eq('artist_id', artistId)
    .eq('name', name)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('tours')
    .insert({
      artist_id: artistId,
      name,
      year: tourYear,
      start_date: null,
      end_date: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function findAdoptableShow(
  supabase: SupabaseAdmin,
  artistId: string,
  showDate: string
): Promise<ExistingShowRow | null> {
  const center = new Date(showDate).getTime();
  const windowStart = new Date(center - 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(center + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('shows')
    .select('id, tour_id, venue_id, show_date, setlistfm_id')
    .eq('artist_id', artistId)
    .gte('show_date', windowStart)
    .lte('show_date', windowEnd)
    .is('setlistfm_id', null)
    .order('show_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ExistingShowRow | null) ?? null;
}

async function upsertShow(
  supabase: SupabaseAdmin,
  params: {
    artistId: string;
    tourId: string | null;
    venueId: string;
    showDate: string;
    localDate: string;
    setlistfmId: string;
  }
): Promise<string> {
  const { data: existingBySetlistFm, error: findError } = await supabase
    .from('shows')
    .select('id, show_date')
    .eq('setlistfm_id', params.setlistfmId)
    .maybeSingle();

  if (findError) throw findError;
  if (existingBySetlistFm?.id) {
    const updatePayload: {
      artist_id: string;
      tour_id: string | null;
      venue_id: string;
      local_date: string;
      time_confirmed: boolean;
      source: 'setlistfm';
      show_date?: string;
    } = {
      artist_id: params.artistId,
      tour_id: params.tourId,
      venue_id: params.venueId,
      local_date: params.localDate,
      time_confirmed: false,
      source: 'setlistfm',
    };

    if (!hasCustomShowTime(existingBySetlistFm.show_date as string)) {
      updatePayload.show_date = params.showDate;
    }

    const { error: updateError } = await supabase
      .from('shows')
      .update(updatePayload)
      .eq('id', existingBySetlistFm.id);
    if (updateError) throw updateError;
    return existingBySetlistFm.id as string;
  }

  const adoptable = await findAdoptableShow(supabase, params.artistId, params.showDate);
  if (adoptable) {
    const { error: adoptError } = await supabase
      .from('shows')
      .update({ setlistfm_id: params.setlistfmId })
      .eq('id', adoptable.id);
    if (adoptError) throw adoptError;
    return adoptable.id;
  }

  const { data, error } = await supabase
    .from('shows')
    .insert({
      artist_id: params.artistId,
      tour_id: params.tourId,
      venue_id: params.venueId,
      show_date: params.showDate,
      local_date: params.localDate,
      time_confirmed: false,
      source: 'setlistfm',
      setlistfm_id: params.setlistfmId,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function upsertSong(
  supabase: SupabaseAdmin,
  artistId: string,
  title: string
): Promise<string> {
  const normalized = title.trim();

  const { data: existing, error: findError } = await supabase
    .from('songs')
    .select('id')
    .eq('artist_id', artistId)
    .ilike('title', normalized)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('songs')
    .insert({
      artist_id: artistId,
      title: normalized,
      mbid: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}
