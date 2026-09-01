import { createSupabaseClient } from './supabase';

const DEFAULT_SAMPLE_SIZE = 10;
const WILDCARD_MIN = 0.25;
const WILDCARD_MAX = 0.85;
const FIXED_SONG_THRESHOLD = 0.9;

export type PredictedSong = {
  song_id: string;
  title: string;
  confidence: number;
  frequency_pct: number;
  avg_position: number | null;
  is_wildcard: boolean;
  appeared_in_shows: number;
  total_shows: number;
};

export type SetlistPrediction = {
  show_id: string;
  artist_id: string;
  tour_id: string | null;
  sample_size: number;
  structure: 'mostly_fixed' | 'rotating' | 'insufficient_data';
  songs: PredictedSong[];
  generated_at: string;
};

type ShowRow = {
  id: string;
  artist_id: string;
  tour_id: string | null;
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

  let historyQuery = supabase
    .from('shows')
    .select('id, show_date')
    .neq('id', target.id)
    .lt('show_date', target.show_date)
    .order('show_date', { ascending: false })
    .limit(sampleSize);

  if (target.tour_id) {
    historyQuery = historyQuery.eq('tour_id', target.tour_id);
  } else {
    historyQuery = historyQuery.eq('artist_id', target.artist_id);
  }

  const { data: historicalShows, error: historyError } = await historyQuery;
  if (historyError) throw historyError;

  const showIds = (historicalShows ?? []).map((row) => row.id as string);
  const totalShows = showIds.length;

  if (totalShows === 0) {
    const empty: SetlistPrediction = {
      show_id: target.id,
      artist_id: target.artist_id,
      tour_id: target.tour_id,
      sample_size: 0,
      structure: 'insufficient_data',
      songs: [],
      generated_at: new Date().toISOString(),
    };
    await cachePrediction(supabase, target.id, empty, 0);
    return empty;
  }

  const { data: showSongRows, error: songsError } = await supabase
    .from('show_songs')
    .select('show_id, song_id, position, songs(id, title)')
    .in('show_id', showIds);

  if (songsError) throw songsError;

  const stats = aggregateSongStats((showSongRows ?? []) as HistoricalShowSong[], totalShows);
  const structure = detectStructure(stats, totalShows);
  const songs = buildPredictedSongs(stats, totalShows);

  const avgConfidence =
    songs.length > 0
      ? songs.reduce((sum, song) => sum + song.confidence, 0) / songs.length
      : 0;

  const prediction: SetlistPrediction = {
    show_id: target.id,
    artist_id: target.artist_id,
    tour_id: target.tour_id,
    sample_size: totalShows,
    structure,
    songs,
    generated_at: new Date().toISOString(),
  };

  await cachePrediction(supabase, target.id, prediction, avgConfidence);
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
): SetlistPrediction['structure'] {
  if (totalShows === 0) return 'insufficient_data';

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

async function cachePrediction(
  supabase: ReturnType<typeof createSupabaseClient>,
  showId: string,
  prediction: SetlistPrediction,
  confidence: number
) {
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
    // Cache failure should not block serving the prediction.
    console.error('Failed to cache setlist prediction', error.message);
  }
}
