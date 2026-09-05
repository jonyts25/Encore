import { createSupabaseAdminClient, createSupabaseClient } from './supabase';

const DEFAULT_SAMPLE_SIZE = 10;
const WILDCARD_MIN = 0.25;
const WILDCARD_MAX = 0.85;
const FIXED_SONG_THRESHOLD = 0.9;

export type PredictedSong = {
  song_id: string;
  title: string;
  confidence: number | null;
  frequency_pct: number | null;
  avg_position: number | null;
  is_wildcard: boolean;
  appeared_in_shows: number;
  total_shows: number;
};

export type SetlistPredictionStructure =
  | 'mostly_fixed'
  | 'rotating'
  | 'insufficient_data'
  | 'single_show_reference'
  | 'limited_tour_data'
  | 'no_tour_data_fallback';

export type SetlistPrediction = {
  show_id: string;
  artist_id: string;
  tour_id: string | null;
  sample_size: number;
  structure: SetlistPredictionStructure;
  reference_show_dates?: string[];
  songs: PredictedSong[];
  generated_at: string;
};

type ShowRow = {
  id: string;
  artist_id: string;
  tour_id: string | null;
  show_date: string;
};

type PriorShowRow = {
  id: string;
  show_date: string;
};

type HistoricalShowSong = {
  show_id: string;
  song_id: string;
  position: number;
  songs: { id: string; title: string } | { id: string; title: string }[];
};

export async function generateShowPrediction(
  showId: string,
  sampleSize = DEFAULT_SAMPLE_SIZE
): Promise<SetlistPrediction | null> {
  const supabase = createSupabaseClient();

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, artist_id, tour_id, show_date')
    .eq('id', showId)
    .maybeSingle();

  if (showError) throw showError;
  if (!show) return null;

  const target = show as ShowRow;
  const tourPriorShows = target.tour_id
    ? await listPriorShows(supabase, {
        tourId: target.tour_id,
        excludeShowId: target.id,
        beforeDate: target.show_date,
        limit: sampleSize,
      })
    : [];

  const tourShowCount = tourPriorShows.length;

  if (tourShowCount >= 3) {
    return buildStatisticalPrediction(supabase, target, tourPriorShows, tourShowCount);
  }

  if (tourShowCount === 1 || tourShowCount === 2) {
    const structure = tourShowCount === 1 ? 'single_show_reference' : 'limited_tour_data';
    return buildReferenceSetlist(supabase, target, tourPriorShows, structure);
  }

  const artistPriorShows = await listPriorShows(supabase, {
    artistId: target.artist_id,
    excludeShowId: target.id,
    beforeDate: target.show_date,
    limit: sampleSize,
  });

  if (artistPriorShows.length === 0) {
    return finishInsufficient(supabase, target);
  }

  return buildStatisticalPrediction(
    supabase,
    target,
    artistPriorShows,
    artistPriorShows.length,
    'no_tour_data_fallback'
  );
}

async function listPriorShows(
  supabase: ReturnType<typeof createSupabaseClient>,
  params: {
    tourId?: string;
    artistId?: string;
    excludeShowId: string;
    beforeDate: string;
    limit: number;
  }
): Promise<PriorShowRow[]> {
  let query = supabase
    .from('shows')
    .select('id, show_date')
    .neq('id', params.excludeShowId)
    .lt('show_date', params.beforeDate)
    .order('show_date', { ascending: false })
    .limit(params.limit);

  if (params.tourId) {
    query = query.eq('tour_id', params.tourId);
  } else if (params.artistId) {
    query = query.eq('artist_id', params.artistId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PriorShowRow[];
}

async function buildStatisticalPrediction(
  supabase: ReturnType<typeof createSupabaseClient>,
  target: ShowRow,
  priorShows: PriorShowRow[],
  sampleSize: number,
  structureOverride?: 'no_tour_data_fallback'
): Promise<SetlistPrediction> {
  const showIds = priorShows.map((row) => row.id);

  const { data: showSongRows, error: songsError } = await supabase
    .from('show_songs')
    .select('show_id, song_id, position, songs(id, title)')
    .in('show_id', showIds);

  if (songsError) throw songsError;

  const stats = aggregateSongStats((showSongRows ?? []) as HistoricalShowSong[], sampleSize);
  const structure =
    structureOverride ?? detectStructure(stats, sampleSize);
  const songs = buildPredictedSongs(stats, sampleSize);

  const avgConfidence =
    songs.length > 0
      ? songs.reduce((sum, song) => sum + (song.confidence ?? 0), 0) / songs.length
      : 0;

  const prediction: SetlistPrediction = {
    show_id: target.id,
    artist_id: target.artist_id,
    tour_id: target.tour_id,
    sample_size: sampleSize,
    structure,
    songs,
    generated_at: new Date().toISOString(),
  };

  await cachePrediction(target.id, prediction, avgConfidence);
  return prediction;
}

async function buildReferenceSetlist(
  supabase: ReturnType<typeof createSupabaseClient>,
  target: ShowRow,
  priorShows: PriorShowRow[],
  structure: 'single_show_reference' | 'limited_tour_data'
): Promise<SetlistPrediction> {
  const sortedShows = [...priorShows].sort((a, b) => b.show_date.localeCompare(a.show_date));
  const referenceShow = sortedShows[0];

  const { data: showSongRows, error: songsError } = await supabase
    .from('show_songs')
    .select('song_id, position, songs(id, title)')
    .eq('show_id', referenceShow.id)
    .order('position', { ascending: true });

  if (songsError) throw songsError;

  const songs: PredictedSong[] = ((showSongRows ?? []) as HistoricalShowSong[]).map((row) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return {
      song_id: row.song_id,
      title: song?.title ?? 'Unknown',
      confidence: null,
      frequency_pct: null,
      avg_position: row.position,
      is_wildcard: false,
      appeared_in_shows: 1,
      total_shows: 1,
    };
  });

  const prediction: SetlistPrediction = {
    show_id: target.id,
    artist_id: target.artist_id,
    tour_id: target.tour_id,
    sample_size: priorShows.length,
    structure,
    reference_show_dates: sortedShows.map((row) => row.show_date),
    songs,
    generated_at: new Date().toISOString(),
  };

  await cachePrediction(target.id, prediction, 0);
  return prediction;
}

type SongAggregate = {
  song_id: string;
  title: string;
  appearances: number;
  positions: number[];
};

function aggregateSongStats(rows: HistoricalShowSong[], totalShows: number): SongAggregate[] {
  const map = new Map<string, SongAggregate>();

  for (const row of rows) {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    if (!song) continue;

    const current = map.get(song.id) ?? {
      song_id: song.id,
      title: song.title,
      appearances: 0,
      positions: [],
    };

    current.appearances += 1;
    current.positions.push(row.position);
    map.set(song.id, current);
  }

  return Array.from(map.values()).sort((a, b) => {
    const freqDiff = b.appearances - a.appearances;
    if (freqDiff !== 0) return freqDiff;
    return a.title.localeCompare(b.title);
  });
}

function buildPredictedSongs(stats: SongAggregate[], totalShows: number): PredictedSong[] {
  return stats.map((item) => {
    const frequencyPct = Math.round((item.appearances / totalShows) * 100);
    const confidence = Number((item.appearances / totalShows).toFixed(2));
    const avgPosition =
      item.positions.length > 0
        ? Number(
            (item.positions.reduce((sum, value) => sum + value, 0) / item.positions.length).toFixed(
              1
            )
          )
        : null;
    const isWildcard = confidence >= WILDCARD_MIN && confidence <= WILDCARD_MAX;

    return {
      song_id: item.song_id,
      title: item.title,
      confidence,
      frequency_pct: frequencyPct,
      avg_position: avgPosition,
      is_wildcard: isWildcard,
      appeared_in_shows: item.appearances,
      total_shows: totalShows,
    };
  });
}

function detectStructure(
  stats: SongAggregate[],
  totalShows: number
): Exclude<SetlistPredictionStructure, 'insufficient_data' | 'single_show_reference' | 'limited_tour_data' | 'no_tour_data_fallback'> {
  const coreSongs = stats.filter((item) => item.appearances / totalShows >= FIXED_SONG_THRESHOLD);
  if (coreSongs.length >= 5) {
    return 'mostly_fixed';
  }

  const rotatingCandidates = stats.filter((item) => {
    const ratio = item.appearances / totalShows;
    return ratio >= WILDCARD_MIN && ratio <= WILDCARD_MAX;
  });

  return rotatingCandidates.length >= 3 ? 'rotating' : 'mostly_fixed';
}

async function finishInsufficient(
  supabase: ReturnType<typeof createSupabaseClient>,
  target: ShowRow
): Promise<SetlistPrediction> {
  const empty: SetlistPrediction = {
    show_id: target.id,
    artist_id: target.artist_id,
    tour_id: target.tour_id,
    sample_size: 0,
    structure: 'insufficient_data',
    songs: [],
    generated_at: new Date().toISOString(),
  };
  await cachePrediction(target.id, empty, 0);
  return empty;
}

async function cachePrediction(
  showId: string,
  prediction: SetlistPrediction,
  confidence: number
) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('setlist_predictions').upsert(
    {
      show_id: showId,
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
