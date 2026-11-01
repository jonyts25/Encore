import { mergeShowIntoCanonical } from './show-merge';
import {
  attachSetlistToShow,
  ingestSetlistEntry,
  upsertVenueFromSetlist,
} from './setlist-ingest';
import {
  getSetlistFmProvider,
  resolveArtistMbid,
  type SetlistFmSetlist,
} from './providers/setlistfm';
import {
  parseSetlistFmSetlistIdFromUrl,
  pickBestMatchingSetlist,
  shouldRunSetlistLink,
  showLocalDateToSetlistFmDate,
  isoShowDateToSetlistFmDate,
} from './setlistfm-link-logic';
import { createSupabaseAdminClient } from './supabase';

export type LinkShowToSetlistFmResult = {
  showId: string;
  linked: boolean;
  setlistfmId: string | null;
  songsInserted: number;
  skippedReason: 'cooldown' | 'no_mbid' | 'no_date' | 'not_found' | null;
};

type ShowLinkRow = {
  id: string;
  artist_id: string;
  venue_id: string;
  show_date: string;
  local_date: string | null;
  setlistfm_id: string | null;
  setlist_checked_at: string | null;
  source: string | null;
  artist: { id: string; name: string; mbid: string | null };
  venue: { city: string | null; lat: number | null; lng: number | null };
};

async function markSetlistChecked(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  showId: string,
  at: Date
): Promise<void> {
  await supabase
    .from('shows')
    .update({ setlist_checked_at: at.toISOString() })
    .eq('id', showId);
}

async function fetchSetlistsForShowDate(
  provider: ReturnType<typeof getSetlistFmProvider>,
  mbid: string,
  setlistDate: string
): Promise<SetlistFmSetlist[]> {
  const collected: SetlistFmSetlist[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await provider.getArtistSetlistsOnDate(mbid, setlistDate, page);
    if (batch.length === 0) break;
    collected.push(...batch);
  }
  return collected;
}

export async function linkShowToSetlistFm(
  showId: string,
  options: { now?: Date; force?: boolean } = {}
): Promise<LinkShowToSetlistFmResult> {
  const supabase = createSupabaseAdminClient();
  const now = options.now ?? new Date();

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select(
      `
      id,
      artist_id,
      venue_id,
      show_date,
      local_date,
      setlistfm_id,
      setlist_checked_at,
      source,
      artist:artists ( id, name, mbid ),
      venue:venues ( city, lat, lng )
    `
    )
    .eq('id', showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) throw new Error(`Show not found: ${showId}`);

  const row = show as unknown as ShowLinkRow;
  const artist = Array.isArray(row.artist) ? row.artist[0] : row.artist;
  const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue;

  if (!options.force && !shouldRunSetlistLink(row.setlist_checked_at, now)) {
    return {
      showId: row.id,
      linked: Boolean(row.setlistfm_id),
      setlistfmId: row.setlistfm_id,
      songsInserted: 0,
      skippedReason: 'cooldown',
    };
  }

  const provider = getSetlistFmProvider();

  let resolvedMbid: string;
  try {
    resolvedMbid = await resolveArtistMbid({
      dbMbid: artist?.mbid ?? null,
      artistName: artist?.name ?? '',
      searchArtistsByName: (name) => provider.searchArtistsByName(name),
    });
  } catch {
    await markSetlistChecked(supabase, row.id, now);
    return {
      showId: row.id,
      linked: false,
      setlistfmId: row.setlistfm_id,
      songsInserted: 0,
      skippedReason: 'no_mbid',
    };
  }

  if (!artist) {
    await markSetlistChecked(supabase, row.id, now);
    return {
      showId: row.id,
      linked: false,
      setlistfmId: row.setlistfm_id,
      songsInserted: 0,
      skippedReason: 'no_mbid',
    };
  }

  if (!artist.mbid) {
    await supabase.from('artists').update({ mbid: resolvedMbid }).eq('id', artist.id);
  }

  const setlistDate =
    (row.local_date && showLocalDateToSetlistFmDate(row.local_date)) ||
    isoShowDateToSetlistFmDate(row.show_date);

  if (!setlistDate) {
    await markSetlistChecked(supabase, row.id, now);
    return {
      showId: row.id,
      linked: false,
      setlistfmId: row.setlistfm_id,
      songsInserted: 0,
      skippedReason: 'no_date',
    };
  }

  if (row.setlistfm_id) {
    const full = await provider.getSetlist(row.setlistfm_id);
    const attached = await attachSetlistToShow(supabase, {
      showId: row.id,
      artistId: row.artist_id,
      setlist: full,
      provider,
      suppressEnrichHook: true,
    });
    await markSetlistChecked(supabase, attached.showId, now);
    return {
      showId: attached.showId,
      linked: true,
      setlistfmId: row.setlistfm_id,
      songsInserted: attached.songsInserted,
      skippedReason: null,
    };
  }

  const setlists = await fetchSetlistsForShowDate(provider, resolvedMbid, setlistDate);
  const picked = pickBestMatchingSetlist(setlists, {
    city: venue?.city ?? null,
    lat: venue?.lat ?? null,
    lng: venue?.lng ?? null,
  });

  if (!picked) {
    await markSetlistChecked(supabase, row.id, now);
    return {
      showId: row.id,
      linked: false,
      setlistfmId: null,
      songsInserted: 0,
      skippedReason: 'not_found',
    };
  }

  const { data: existingBySetlist, error: existingError } = await supabase
    .from('shows')
    .select('id')
    .eq('setlistfm_id', picked.id)
    .maybeSingle();

  if (existingError) throw existingError;

  let targetShowId = row.id;

  if (existingBySetlist?.id && existingBySetlist.id !== row.id) {
    await attachSetlistToShow(supabase, {
      showId: existingBySetlist.id as string,
      artistId: row.artist_id,
      setlist: picked,
      provider,
      suppressEnrichHook: true,
    });
    await mergeShowIntoCanonical(supabase, row.id, existingBySetlist.id as string);
    targetShowId = existingBySetlist.id as string;
  } else {
    await attachSetlistToShow(supabase, {
      showId: row.id,
      artistId: row.artist_id,
      setlist: picked,
      provider,
      suppressEnrichHook: true,
    });
  }

  await markSetlistChecked(supabase, targetShowId, now);

  const { count } = await supabase
    .from('show_songs')
    .select('id', { count: 'exact', head: true })
    .eq('show_id', targetShowId);

  return {
    showId: targetShowId,
    linked: true,
    setlistfmId: picked.id,
    songsInserted: count ?? 0,
    skippedReason: null,
  };
}

export async function importSetlistFromUrl(url: string): Promise<{ showId: string }> {
  const setlistId = parseSetlistFmSetlistIdFromUrl(url);
  if (!setlistId) {
    throw new Error('invalid_setlist_url');
  }

  const supabase = createSupabaseAdminClient();
  const provider = getSetlistFmProvider();

  let setlist: SetlistFmSetlist;
  try {
    setlist = await provider.getSetlist(setlistId);
  } catch {
    throw new Error('setlist_not_found');
  }

  const mbid = setlist.artist.mbid;
  if (!mbid) {
    throw new Error('setlist_missing_artist_mbid');
  }

  const { confirmArtistResolution } = await import('./artist-resolve');
  const artist = await confirmArtistResolution(mbid);
  if (!artist) {
    throw new Error('artist_resolve_failed');
  }

  const { data: existingShow, error: existingError } = await supabase
    .from('shows')
    .select('id')
    .eq('setlistfm_id', setlist.id)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existingShow?.id) {
    await attachSetlistToShow(supabase, {
      showId: existingShow.id as string,
      artistId: artist.id,
      setlist,
      provider,
      suppressEnrichHook: true,
    });
    return { showId: existingShow.id as string };
  }

  await ingestSetlistEntry(supabase, artist.id, setlist, provider, {
    suppressEnrichHook: true,
  });

  const { data: created, error: createdError } = await supabase
    .from('shows')
    .select('id')
    .eq('setlistfm_id', setlist.id)
    .maybeSingle();

  if (createdError) throw createdError;
  if (!created?.id) {
    throw new Error('show_import_failed');
  }

  return { showId: created.id as string };
}
