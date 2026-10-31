import type { Show } from '@/modules/events/types';

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
