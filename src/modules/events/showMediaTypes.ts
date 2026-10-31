export type ShowMediaSource = 'live' | 'library';
export type ShowMediaType = 'photo' | 'video';

export type ShowMediaRow = {
  id: string;
  user_id: string;
  show_id: string;
  asset_id: string;
  media_type: ShowMediaType;
  taken_at: string;
  song_id: string | null;
  source: ShowMediaSource;
  created_at: string;
};

export type ShowMediaInsertPayload = {
  show_id: string;
  asset_id: string;
  media_type: ShowMediaType;
  taken_at: string;
  song_id?: string | null;
  source: ShowMediaSource;
};
