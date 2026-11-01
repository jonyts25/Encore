import { ensureArtistImageUrl } from './artist-photos';
import {
  detectCurrentTourName,
  ENRICH_LOOKBACK_MONTHS,
  filterRecentSetlistsWithSongs,
  isSetlistWithinMonths,
  normalizeTourName,
  shouldAssignTourToShow,
  shouldRunEnrich,
  shouldShowNewTourEnrichmentNotice,
  type SetlistTourCandidate,
} from './enrich-show-logic';
import { generateShowPrediction, type SetlistPrediction } from './setlist-prediction';
import {
  flattenSetlistSongs,
  getSetlistFmProvider,
  resolveArtistMbid,
  type SetlistFmSetlist,
} from './providers/setlistfm';
import { ingestSetlistEntry } from './setlist-ingest';
import { createSupabaseAdminClient } from './supabase';
import { isShowActive } from './visibility';

export type EnrichShowResult = {
  status: 'completed' | 'skipped_cooldown' | 'skipped_not_active';
  show_id: string;
  enriched_at: string | null;
  assigned_tour: boolean;
  setlists_processed: number;
  prediction: SetlistPrediction | null;
};

type ShowEnrichRow = {
  id: string;
  artist_id: string;
  tour_id: string | null;
  show_date: string;
  enriched_at: string | null;
  local_date?: string;
  time_confirmed?: boolean;
  venue?: { timezone?: string | null };
  artist: { id: string; name: string; mbid: string | null; image_url: string | null };
};

async function resolveTourNameForSetlist(
  setlist: SetlistFmSetlist,
  provider: ReturnType<typeof getSetlistFmProvider>
): Promise<string | null> {
  const fromList = setlist.tour?.name?.trim();
  if (fromList) return fromList;
  const full = await provider.getSetlist(setlist.id);
  return full.tour?.name?.trim() || null;
}

async function findOrCreateTourId(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  artistId: string,
  tourName: string,
  referenceEventDate: string
): Promise<string> {
  const [, month, year] = referenceEventDate.split('-').map(Number);
  const tourYear = year || new Date().getUTCFullYear();
  void month;

  const normalizedTarget = normalizeTourName(tourName);
  const { data: tours, error: listError } = await supabase
    .from('tours')
    .select('id, name')
    .eq('artist_id', artistId);

  if (listError) throw listError;

  const existing = (tours ?? []).find(
    (row) => normalizeTourName(String(row.name)) === normalizedTarget
  );
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('tours')
    .insert({
      artist_id: artistId,
      name: tourName.trim(),
      year: tourYear,
      start_date: null,
      end_date: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

async function buildTourCandidates(
  setlists: SetlistFmSetlist[],
  provider: ReturnType<typeof getSetlistFmProvider>
): Promise<SetlistTourCandidate[]> {
  const candidates: SetlistTourCandidate[] = [];
  for (const setlist of setlists) {
    const hasSongs = flattenSetlistSongs(setlist).length > 0;
    const tourName = hasSongs ? await resolveTourNameForSetlist(setlist, provider) : null;
    candidates.push({
      setlistId: setlist.id,
      eventDate: setlist.eventDate,
      tourName,
      hasSongs,
    });
  }
  return candidates;
}

export async function enrichShow(showId: string): Promise<EnrichShowResult> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select(
      `
      id,
      artist_id,
      tour_id,
      show_date,
      enriched_at,
      local_date,
      time_confirmed,
      venue:venues ( timezone ),
      artist:artists ( id, name, mbid, image_url )
    `
    )
    .eq('id', showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) {
    throw new Error(`Show not found: ${showId}`);
  }

  const showRow = show as unknown as ShowEnrichRow;
  const artist = Array.isArray(showRow.artist) ? showRow.artist[0] : showRow.artist;
  if (!artist) throw new Error(`Show ${showId} is missing artist`);

  if (
    !isShowActive({
      show_date: showRow.show_date,
      local_date: showRow.local_date,
      time_confirmed: showRow.time_confirmed,
      venue: Array.isArray(showRow.venue) ? showRow.venue[0] : showRow.venue,
    })
  ) {
    return {
      status: 'skipped_not_active',
      show_id: showId,
      enriched_at: showRow.enriched_at,
      assigned_tour: false,
      setlists_processed: 0,
      prediction: null,
    };
  }

  if (!shouldRunEnrich(showRow.enriched_at, now)) {
    const prediction = await generateShowPrediction(showId);
    return {
      status: 'skipped_cooldown',
      show_id: showId,
      enriched_at: showRow.enriched_at,
      assigned_tour: false,
      setlists_processed: 0,
      prediction,
    };
  }

  const provider = getSetlistFmProvider();
  const resolvedMbid = await resolveArtistMbid({
    dbMbid: artist.mbid,
    artistName: artist.name,
    searchArtistsByName: (name) => provider.searchArtistsByName(name),
  });

  if (!artist.mbid) {
    await supabase.from('artists').update({ mbid: resolvedMbid }).eq('id', artist.id);
  }

  await ensureArtistImageUrl({
    id: artist.id,
    name: artist.name,
    image_url: artist.image_url,
  });

  const fetched: SetlistFmSetlist[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await provider.getArtistSetlists(resolvedMbid, page);
    if (batch.length === 0) break;
    fetched.push(...batch);
  }

  const recentSetlists = fetched.filter(
    (setlist) =>
      isSetlistWithinMonths(setlist.eventDate, ENRICH_LOOKBACK_MONTHS, now) &&
      flattenSetlistSongs(setlist).length > 0
  );

  const tourCandidates = await buildTourCandidates(recentSetlists, provider);
  const recentCandidates = filterRecentSetlistsWithSongs(
    tourCandidates,
    ENRICH_LOOKBACK_MONTHS,
    now
  );

  let setlistsProcessed = 0;
  for (const setlist of recentSetlists) {
    if (flattenSetlistSongs(setlist).length === 0) continue;
    try {
      await ingestSetlistEntry(supabase, artist.id, setlist, provider, {
        suppressEnrichHook: true,
      });
      setlistsProcessed += 1;
    } catch {
      // Continue with other setlists.
    }
  }

  const currentTourName = detectCurrentTourName(recentCandidates);
  let assignedTour = false;
  let tourId = showRow.tour_id;

  if (
    shouldAssignTourToShow({
      existingTourId: showRow.tour_id,
      currentTourName,
      candidates: recentCandidates,
      now,
    }) &&
    currentTourName
  ) {
    const referenceDate =
      recentCandidates.find((item) => item.tourName === currentTourName)?.eventDate ??
      recentCandidates[0]?.eventDate ??
      '01-01-2026';
    const newTourId = await findOrCreateTourId(
      supabase,
      showRow.artist_id,
      currentTourName,
      referenceDate
    );
    const { error: tourUpdateError } = await supabase
      .from('shows')
      .update({ tour_id: newTourId })
      .eq('id', showId);
    if (tourUpdateError) throw tourUpdateError;
    tourId = newTourId;
    assignedTour = true;
  }

  void tourId;

  let prediction = await generateShowPrediction(showId);
  if (
    prediction &&
    shouldShowNewTourEnrichmentNotice({
      assignedTourThisRun: assignedTour,
      structure: prediction.structure,
    })
  ) {
    prediction = {
      ...prediction,
      enrichment_notice: 'new_tour_from_recent_shows',
    };
    const confidence =
      prediction.songs.length > 0
        ? prediction.songs.reduce((sum, song) => sum + (song.confidence ?? 0), 0) /
          prediction.songs.length
        : null;
    await supabase.from('setlist_predictions').upsert(
      {
        show_id: prediction.show_id,
        payload_json: prediction,
        confidence,
        generated_at: prediction.generated_at,
      },
      { onConflict: 'show_id' }
    );
  }

  const enrichedAt = now.toISOString();
  const { error: enrichedError } = await supabase
    .from('shows')
    .update({ enriched_at: enrichedAt })
    .eq('id', showId);
  if (enrichedError) throw enrichedError;

  return {
    status: 'completed',
    show_id: showId,
    enriched_at: enrichedAt,
    assigned_tour: assignedTour,
    setlists_processed: setlistsProcessed,
    prediction,
  };
}
