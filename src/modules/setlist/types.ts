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
