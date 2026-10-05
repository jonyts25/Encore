import { createSupabaseAdminClient } from './supabase';

const WILDCARD_FREQUENCY_PCT = 70;
const FIXED_SONG_THRESHOLD = 0.9;
const PRIOR_SHOW_CANDIDATE_POOL = 50;

export type PredictedSong = {
  song_id: string;
  title: string;
  confidence: number | null;
  frequency_pct: number | null;
  avg_position: number | null;
  is_wildcard: boolean;
  appeared_in_shows: number;
  total_shows: number;
  position?: number;
  is_encore?: boolean;
  is_medley?: boolean;
};

export type PredictionOtherSong = {
  song_id: string;
  title: string;
  frequency: number;
  frequency_pct: number;
};

export type PredictionReferenceShow = {
  show_id: string;
  show_date: string;
  venue_name: string | null;
  city: string | null;
  songs_count: number;
};

export type SetlistPrediction = {
  show_id: string;
  artist_id: string;
  tour_id: string | null;
  sample_size: number;
  structure:
    | 'mostly_fixed'
    | 'rotating'
    | 'insufficient_data'
    | 'single_show_reference'
    | 'limited_tour_data'
    | 'no_tour_data_fallback';
  reference_show_dates?: string[];
  songs: PredictedSong[];
  generated_at: string;
  others?: PredictionOtherSong[];
  meta?: {
    sample_size: number;
    show_length_median: number;
  };
  reference_shows?: PredictionReferenceShow[];
};

export type ActualSetlistSong = {
  song_id: string;
  title: string;
  position: number;
  is_encore: boolean;
};

type ShowRow = {
  id: string;
  artist_id: string;
  tour_id: string | null;
  show_date: string;
};

type VenueRelation = {
  name: string | null;
  city: string | null;
};

type PriorShowRow = ShowRow & {
  venue: VenueRelation | null;
};

type RawPriorShowRow = ShowRow & {
  venue: VenueRelation | VenueRelation[] | null;
};

type ShowSongRow = {
  show_id: string;
  position: number;
  is_encore: boolean;
  song: { id: string; title: string } | null;
};

type SongAggregate = {
  normalizedKey: string;
  titleCounts: Map<string, number>;
  songIdCounts: Map<string, number>;
  appearances: Array<{
    showId: string;
    showDate: string;
    position: number;
    isEncore: boolean;
  }>;
};

const NON_SONG_MARKERS = new Set(['intro', 'outro']);

export async function generateShowPrediction(
  showId: string,
  sampleSize = 10
): Promise<SetlistPrediction | null> {
  const supabase = createSupabaseAdminClient();
  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, artist_id, tour_id, show_date')
    .eq('id', showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) return null;

  const showRow = show as ShowRow;
  const priorShows = await listPriorShowsWithVenues(
    supabase,
    showRow.artist_id,
    showRow.tour_id,
    showRow.id,
    showRow.show_date,
    sampleSize
  );

  let prediction: SetlistPrediction;

  if (showRow.tour_id) {
    if (priorShows.length >= 3) {
      prediction = await buildStatisticalPrediction(showRow, priorShows);
    } else if (priorShows.length >= 1) {
      prediction = await buildReferenceSetlist(showRow, priorShows);
    } else {
      prediction = await buildFallbackPrediction(showRow, sampleSize);
    }
  } else {
    prediction = await buildFallbackPrediction(showRow, sampleSize);
  }

  await cachePrediction(prediction);
  return prediction;
}

export async function getShowSetlist(showId: string): Promise<ActualSetlistSong[] | null> {
  const supabase = createSupabaseAdminClient();

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) return null;

  const { data, error } = await supabase
    .from('show_songs')
    .select('position, is_encore, song:songs ( id, title )')
    .eq('show_id', showId)
    .order('position', { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const rawSong = row.song as { id: string; title: string } | { id: string; title: string }[] | null;
      const song = Array.isArray(rawSong) ? rawSong[0] : rawSong;
      if (!song) return null;
      return {
        song_id: song.id,
        title: song.title,
        position: row.position,
        is_encore: Boolean(row.is_encore),
      };
    })
    .filter((row): row is ActualSetlistSong => row !== null);
}

async function buildStatisticalPrediction(
  show: ShowRow,
  priorShows: PriorShowRow[]
): Promise<SetlistPrediction> {
  const showIds = priorShows.map((row) => row.id);
  const showSongs = await listShowSongs(showIds);
  const reconstructed = buildReconstructedSetlist(priorShows, showSongs);

  return {
    show_id: show.id,
    artist_id: show.artist_id,
    tour_id: show.tour_id,
    sample_size: priorShows.length,
    structure: detectStructure(reconstructed.songs, priorShows.length),
    songs: reconstructed.songs,
    others: reconstructed.others,
    meta: {
      sample_size: priorShows.length,
      show_length_median: reconstructed.showLengthMedian,
    },
    reference_shows: buildReferenceShows(priorShows, showSongs),
    generated_at: new Date().toISOString(),
  };
}

async function buildReferenceSetlist(
  show: ShowRow,
  priorShows: PriorShowRow[]
): Promise<SetlistPrediction> {
  const referenceShow = priorShows[0];
  const allShowSongs = await listShowSongs(priorShows.map((row) => row.id));
  const referenceSongs = allShowSongs.filter((row) => row.show_id === referenceShow.id);
  const totalShows = priorShows.length;

  const songs: PredictedSong[] = referenceSongs
    .filter((row) => row.song && !isNonSongMarker(row.song.title))
    .map((row) => ({
      song_id: row.song!.id,
      title: row.song!.title,
      confidence: null,
      frequency_pct: null,
      avg_position: row.position,
      is_wildcard: false,
      appeared_in_shows: 1,
      total_shows: 1,
      position: row.position,
      is_encore: Boolean(row.is_encore),
      is_medley: isMedley(row.song!.title),
    }));

  return {
    show_id: show.id,
    artist_id: show.artist_id,
    tour_id: show.tour_id,
    sample_size: totalShows,
    structure: totalShows === 1 ? 'single_show_reference' : 'limited_tour_data',
    reference_show_dates: priorShows.map((row) => row.show_date),
    reference_shows: buildReferenceShows(priorShows, allShowSongs),
    songs,
    generated_at: new Date().toISOString(),
  };
}

async function buildFallbackPrediction(
  show: ShowRow,
  sampleSize: number
): Promise<SetlistPrediction> {
  const supabase = createSupabaseAdminClient();
  const artistPriorShows = await listPriorShowsWithVenues(
    supabase,
    show.artist_id,
    null,
    show.id,
    show.show_date,
    sampleSize
  );

  if (artistPriorShows.length >= 3) {
    return {
      ...(await buildStatisticalPrediction(show, artistPriorShows)),
      tour_id: null,
      structure: 'no_tour_data_fallback',
    };
  }

  if (artistPriorShows.length >= 1) {
    return {
      ...(await buildReferenceSetlist(show, artistPriorShows)),
      tour_id: null,
      structure: 'no_tour_data_fallback',
    };
  }

  return {
    show_id: show.id,
    artist_id: show.artist_id,
    tour_id: show.tour_id,
    sample_size: 0,
    structure: 'insufficient_data',
    songs: [],
    generated_at: new Date().toISOString(),
  };
}

function buildReconstructedSetlist(
  priorShows: PriorShowRow[],
  showSongs: ShowSongRow[]
): {
  songs: PredictedSong[];
  others: PredictionOtherSong[];
  showLengthMedian: number;
} {
  const sampleSize = priorShows.length;
  const showDateById = new Map(priorShows.map((row) => [row.id, row.show_date]));
  const songsByShow = groupSongsByShow(showSongs);

  const showLengths = priorShows.map((show) => countSetlistSongs(songsByShow.get(show.id) ?? []));
  const showLengthMedian = median(showLengths);
  const k = Math.max(1, showLengthMedian);

  const aggregates = aggregateByNormalizedTitle(priorShows, songsByShow, showDateById);
  const ranked = [...aggregates].sort(compareCandidates);
  const topKeys = new Set(ranked.slice(0, k).map((entry) => entry.normalizedKey));
  const topEntries = ranked
    .filter((entry) => topKeys.has(entry.normalizedKey))
    .sort((a, b) => a.avgPosition - b.avgPosition);

  const songs: PredictedSong[] = topEntries.map((entry, index) => {
    const title = pickDisplayTitle(entry);
    const songId = pickPrimarySongId(entry, title);
    const appearedInShows = entry.appearances.length;
    const confidence =
      sampleSize > 0 ? Number((appearedInShows / sampleSize).toFixed(2)) : 0;
    const frequencyPct =
      sampleSize > 0 ? Math.round((appearedInShows / sampleSize) * 100) : 0;
    const encoreShows = entry.appearances.filter((appearance) => appearance.isEncore).length;

    return {
      song_id: songId,
      title,
      confidence,
      frequency_pct: frequencyPct,
      avg_position: Number(entry.avgPosition.toFixed(1)),
      is_wildcard: frequencyPct < WILDCARD_FREQUENCY_PCT,
      appeared_in_shows: appearedInShows,
      total_shows: sampleSize,
      position: index + 1,
      is_encore: encoreShows > appearedInShows / 2,
      is_medley: isMedley(title),
    };
  });

  const others: PredictionOtherSong[] = ranked
    .filter((entry) => !topKeys.has(entry.normalizedKey))
    .filter((entry) => !(isMedley(pickDisplayTitle(entry)) && entry.appearances.length === 1))
    .slice(0, 12)
    .map((entry) => {
      const title = pickDisplayTitle(entry);
      const frequency = entry.appearances.length;
      return {
        song_id: pickPrimarySongId(entry, title),
        title,
        frequency,
        frequency_pct: sampleSize > 0 ? Math.round((frequency / sampleSize) * 100) : 0,
      };
    });

  return { songs, others, showLengthMedian };
}

function aggregateByNormalizedTitle(
  priorShows: PriorShowRow[],
  songsByShow: Map<string, ShowSongRow[]>,
  showDateById: Map<string, string>
): Array<SongAggregate & { avgPosition: number; latestShowDate: string }> {
  const byKey = new Map<string, SongAggregate>();

  for (const show of priorShows) {
    const rows = songsByShow.get(show.id) ?? [];
    for (const row of rows) {
      if (!row.song || isNonSongMarker(row.song.title)) continue;

      const normalizedKey = normalizeTitle(row.song.title);
      if (!normalizedKey) continue;

      let aggregate = byKey.get(normalizedKey);
      if (!aggregate) {
        aggregate = {
          normalizedKey,
          titleCounts: new Map(),
          songIdCounts: new Map(),
          appearances: [],
        };
        byKey.set(normalizedKey, aggregate);
      }

      aggregate.titleCounts.set(
        row.song.title,
        (aggregate.titleCounts.get(row.song.title) ?? 0) + 1
      );
      aggregate.songIdCounts.set(row.song.id, (aggregate.songIdCounts.get(row.song.id) ?? 0) + 1);
      aggregate.appearances.push({
        showId: show.id,
        showDate: showDateById.get(show.id) ?? show.show_date,
        position: row.position,
        isEncore: Boolean(row.is_encore),
      });
    }
  }

  return [...byKey.values()].map((aggregate) => {
    const avgPosition =
      aggregate.appearances.reduce((sum, appearance) => sum + appearance.position, 0) /
      aggregate.appearances.length;
    const latestShowDate = aggregate.appearances.reduce(
      (latest, appearance) => (appearance.showDate > latest ? appearance.showDate : latest),
      aggregate.appearances[0]?.showDate ?? ''
    );

    return { ...aggregate, avgPosition, latestShowDate };
  });
}

function compareCandidates(
  a: SongAggregate & { avgPosition: number; latestShowDate: string },
  b: SongAggregate & { avgPosition: number; latestShowDate: string }
): number {
  const freqDiff = b.appearances.length - a.appearances.length;
  if (freqDiff !== 0) return freqDiff;

  const dateDiff = b.latestShowDate.localeCompare(a.latestShowDate);
  if (dateDiff !== 0) return dateDiff;

  return a.avgPosition - b.avgPosition;
}

function buildReferenceShows(
  priorShows: PriorShowRow[],
  showSongs: ShowSongRow[]
): PredictionReferenceShow[] {
  const songsByShow = groupSongsByShow(showSongs);

  return priorShows.map((show) => ({
    show_id: show.id,
    show_date: show.show_date,
    venue_name: show.venue?.name ?? null,
    city: show.venue?.city ?? null,
    songs_count: countSetlistSongs(songsByShow.get(show.id) ?? []),
  }));
}

function groupSongsByShow(showSongs: ShowSongRow[]): Map<string, ShowSongRow[]> {
  const grouped = new Map<string, ShowSongRow[]>();
  for (const row of showSongs) {
    const existing = grouped.get(row.show_id) ?? [];
    existing.push(row);
    grouped.set(row.show_id, existing);
  }
  return grouped;
}

function countSetlistSongs(rows: ShowSongRow[]): number {
  return rows.filter((row) => row.song && !isNonSongMarker(row.song.title)).length;
}

function pickDisplayTitle(entry: SongAggregate): string {
  let bestTitle = '';
  let bestCount = -1;

  for (const [title, count] of entry.titleCounts.entries()) {
    if (count > bestCount) {
      bestTitle = title;
      bestCount = count;
    }
  }

  return bestTitle;
}

function pickPrimarySongId(entry: SongAggregate, title: string): string {
  let bestSongId = '';
  let bestCount = -1;

  for (const [songId, count] of entry.songIdCounts.entries()) {
    if (count > bestCount) {
      bestSongId = songId;
      bestCount = count;
    }
  }

  return bestSongId || [...entry.songIdCounts.keys()][0] || title;
}

function normalizeTitle(title: string): string {
  let normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^\p{L}\p{N}\s/]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

function isNonSongMarker(title: string): boolean {
  const normalized = normalizeTitle(title);
  return NON_SONG_MARKERS.has(normalized);
}

function isMedley(title: string): boolean {
  return title.includes(' / ');
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function detectStructure(
  songs: PredictedSong[],
  sampleSize: number
): 'mostly_fixed' | 'rotating' {
  const coreSongs = songs.filter(
    (song) => sampleSize > 0 && (song.appeared_in_shows / sampleSize) >= FIXED_SONG_THRESHOLD
  );
  if (coreSongs.length >= 5) return 'mostly_fixed';

  const rotatingCandidates = songs.filter(
    (song) => (song.frequency_pct ?? 0) < WILDCARD_FREQUENCY_PCT
  );

  return rotatingCandidates.length >= 3 ? 'rotating' : 'mostly_fixed';
}

function normalizeVenueRelation(
  venue: VenueRelation | VenueRelation[] | null | undefined
): VenueRelation | null {
  if (!venue) return null;
  if (Array.isArray(venue)) return venue[0] ?? null;
  return venue;
}

function normalizePriorShowRows(rows: RawPriorShowRow[]): PriorShowRow[] {
  return rows.map((row) => ({
    id: row.id,
    artist_id: row.artist_id,
    tour_id: row.tour_id,
    show_date: row.show_date,
    venue: normalizeVenueRelation(row.venue),
  }));
}

function getUtcCalendarDay(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function listShowIdsWithSongs(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  showIds: string[]
): Promise<Set<string>> {
  if (showIds.length === 0) return new Set();

  const { data, error } = await supabase.from('show_songs').select('show_id').in('show_id', showIds);
  if (error) throw error;

  return new Set((data ?? []).map((row) => row.show_id as string));
}

async function listPriorShowsWithVenues(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  artistId: string,
  tourId: string | null,
  excludeShowId: string,
  targetShowDate: string,
  sampleSize: number
): Promise<PriorShowRow[]> {
  const now = new Date().toISOString();
  const targetDay = getUtcCalendarDay(targetShowDate);
  const limit = Math.min(sampleSize, 10);

  let query = supabase
    .from('shows')
    .select('id, artist_id, tour_id, show_date, venue:venues ( name, city )')
    .eq('artist_id', artistId)
    .neq('id', excludeShowId)
    .lt('show_date', now)
    .order('show_date', { ascending: false })
    .limit(PRIOR_SHOW_CANDIDATE_POOL);

  if (tourId) {
    query = query.eq('tour_id', tourId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const candidates = normalizePriorShowRows((data ?? []) as RawPriorShowRow[]).filter(
    (show) => getUtcCalendarDay(show.show_date) !== targetDay
  );
  if (candidates.length === 0) return [];

  const showIdsWithSongs = await listShowIdsWithSongs(
    supabase,
    candidates.map((show) => show.id)
  );

  return candidates.filter((show) => showIdsWithSongs.has(show.id)).slice(0, limit);
}

async function listShowSongs(showIds: string[]): Promise<ShowSongRow[]> {
  if (showIds.length === 0) return [];

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('show_songs')
    .select('show_id, position, is_encore, song:songs ( id, title )')
    .in('show_id', showIds)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ShowSongRow[];
}

async function cachePrediction(prediction: SetlistPrediction): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const confidence =
    prediction.songs.length > 0
      ? prediction.songs.reduce((sum, song) => sum + (song.confidence ?? 0), 0) /
        prediction.songs.length
      : null;

  const { error } = await supabase.from('setlist_predictions').upsert(
    {
      show_id: prediction.show_id,
      payload_json: prediction,
      confidence,
      generated_at: prediction.generated_at,
    },
    { onConflict: 'show_id' }
  );

  if (error) {
    console.error('Failed to cache setlist prediction', error.message);
  }
}
