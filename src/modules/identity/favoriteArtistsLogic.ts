export const MAX_FAVORITE_ARTISTS = 10;

export const FAVORITE_ARTISTS_LIMIT_ERROR = 'favorite_artists_limit';

export type FollowedArtistRow = {
  is_favorite: boolean;
  favorited_at: string | null;
  followed_at: string;
};

export function canMarkArtistFavorite(
  currentFavoriteCount: number,
  alreadyFavorite: boolean
): boolean {
  if (alreadyFavorite) return true;
  return currentFavoriteCount < MAX_FAVORITE_ARTISTS;
}

export function isFavoriteArtistsLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: string }).message ?? '') : '';
  return message.includes(FAVORITE_ARTISTS_LIMIT_ERROR);
}

export function compareFollowedArtistRows<T extends FollowedArtistRow>(a: T, b: T): number {
  if (a.is_favorite !== b.is_favorite) {
    return a.is_favorite ? -1 : 1;
  }
  if (a.is_favorite && b.is_favorite) {
    const aFav = a.favorited_at ? new Date(a.favorited_at).getTime() : 0;
    const bFav = b.favorited_at ? new Date(b.favorited_at).getTime() : 0;
    return bFav - aFav;
  }
  return new Date(b.followed_at).getTime() - new Date(a.followed_at).getTime();
}

export function sortFollowedArtistRows<T extends FollowedArtistRow>(rows: T[]): T[] {
  return [...rows].sort(compareFollowedArtistRows);
}

export type FollowedArtistSortable = {
  isFavorite: boolean;
  favoritedAt: string | null;
  followedAt: string;
};

export function sortFollowedArtists<T extends FollowedArtistSortable>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) {
      return a.isFavorite ? -1 : 1;
    }
    if (a.isFavorite && b.isFavorite) {
      const aFav = a.favoritedAt ? new Date(a.favoritedAt).getTime() : 0;
      const bFav = b.favoritedAt ? new Date(b.favoritedAt).getTime() : 0;
      return bFav - aFav;
    }
    return new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime();
  });
}
