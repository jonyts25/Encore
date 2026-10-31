import type { Show } from '@/modules/events/types';

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

export type ShowMemorySummary = {
  memoryId: string | null;
  rating: number | null;
  setlistConfirmedAt: string | null;
  songsPlayedCount: number;
};

export type ShowMediaThumb = {
  assetId: string;
  mediaType: 'photo' | 'video';
};

export type DiscographyShowEntry = {
  show: Show;
  memory: ShowMemorySummary;
  firstMedia: ShowMediaThumb | null;
};

export type DiscographyFavoriteArtist = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type DiscographyPayload = {
  entries: DiscographyShowEntry[];
  favoriteArtists: DiscographyFavoriteArtist[];
};

export type DiscographyYearFilter = number | 'all';

export type DiscographyStats = {
  concerts: number;
  distinctArtists: number;
  liveSongs: number;
  cities: number;
  countries: number;
  busiestMonthKey: string | null;
  favoritesSeen: number;
  favoritesTotal: number;
  hasConfirmedSetlist: boolean;
  firstPendingSetlistShowId: string | null;
};

export type DiscographyMonthGroup = {
  monthKey: string;
  label: string;
  entries: DiscographyShowEntry[];
};
