import { createSupabaseAdminClient } from './supabase';
import {
  flattenSetlistSongs,
  getSetlistFmProvider,
  parseSetlistFmEventDate,
  resolveArtistMbid,
  type SetlistFmProvider,
  type SetlistFmSetlist,
} from './providers/setlistfm';

type ArtistRow = {
  id: string;
  name: string;
  mbid: string | null;
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
    .select('id, name, mbid')
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
      const stats = await persistSetlist(supabase, artistRow.id, setlist, provider);
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

async function persistSetlist(
  supabase: SupabaseAdmin,
  artistId: string,
  setlist: SetlistFmSetlist,
  provider: SetlistFmProvider
) {
  const tourName = await resolveTourName(setlist, provider);
  const venueId = await upsertVenue(supabase, setlist);
  const tourId = await upsertTour(supabase, artistId, tourName, setlist.eventDate);
  const showDate = parseSetlistFmEventDate(setlist.eventDate);
  const showId = await upsertShow(supabase, {
    artistId,
    tourId,
    venueId,
    showDate,
    setlistfmId: setlist.id,
  });

  const parsedSongs = flattenSetlistSongs(setlist);
  if (parsedSongs.length === 0) {
    return {
      showUpserted: Boolean(showId),
      tourLinked: Boolean(tourId),
      songsUpserted: 0,
      showSongsInserted: 0,
    };
  }

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

  return { showUpserted: true, tourLinked: Boolean(tourId), songsUpserted, showSongsInserted };
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

async function upsertVenue(supabase: SupabaseAdmin, setlist: SetlistFmSetlist): Promise<string> {
  const venue = setlist.venue;
  const city = venue.city.name;
  const country = venue.city.country.name;

  const { data: existing, error: findError } = await supabase
    .from('venues')
    .select('id')
    .eq('name', venue.name)
    .eq('city', city)
    .eq('country', country)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const lat = venue.city.coords?.lat ?? null;
  const lng = venue.city.coords?.long ?? null;

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: venue.name,
      city,
      country,
      lat,
      lng,
      capacity: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
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

async function upsertShow(
  supabase: SupabaseAdmin,
  params: {
    artistId: string;
    tourId: string | null;
    venueId: string;
    showDate: string;
    setlistfmId: string;
  }
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('shows')
    .select('id')
    .eq('setlistfm_id', params.setlistfmId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('shows')
      .update({
        artist_id: params.artistId,
        tour_id: params.tourId,
        venue_id: params.venueId,
        show_date: params.showDate,
      })
      .eq('id', existing.id);
    if (updateError) throw updateError;
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from('shows')
    .insert({
      artist_id: params.artistId,
      tour_id: params.tourId,
      venue_id: params.venueId,
      show_date: params.showDate,
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
