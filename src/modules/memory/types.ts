export type MemoryRow = {
  id: string;
  user_id: string;
  show_id: string;
  rating: number | null;
  note: string | null;
  setlist_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MemorySongRow = {
  id: string;
  memory_id: string;
  song_id: string;
  position: number;
  is_encore: boolean;
  is_highlight: boolean;
};

export type MemorySongWithTitle = MemorySongRow & {
  title: string;
};

export type ShowMemory = MemoryRow & {
  songs: MemorySongWithTitle[];
};

export type MemorySavePayload = {
  show_id: string;
  rating: number | null;
  note: string | null;
  setlist_confirmed_at: string | null;
  songs: {
    song_id: string;
    position: number;
    is_encore: boolean;
    is_highlight: boolean;
  }[];
};

export type SetlistDraftItem = {
  key: string;
  songId: string;
  title: string;
  played: boolean;
  isHighlight: boolean;
};
