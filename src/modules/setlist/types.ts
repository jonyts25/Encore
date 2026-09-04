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

export type SetlistPredictionStructure = 'mostly_fixed' | 'rotating' | 'insufficient_data';

export type SetlistPrediction = {
  show_id: string;
  artist_id: string;
  tour_id: string | null;
  sample_size: number;
  structure: SetlistPredictionStructure;
  songs: PredictedSong[];
  generated_at: string;
};
