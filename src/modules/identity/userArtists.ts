import { supabase } from '@/core/api/supabase';

import {
  canMarkArtistFavorite,
  isFavoriteArtistsLimitError,
} from './favoriteArtistsLogic';

export {
  canMarkArtistFavorite,
  FAVORITE_ARTISTS_LIMIT_ERROR,
  isFavoriteArtistsLimitError,
  MAX_FAVORITE_ARTISTS,
} from './favoriteArtistsLogic';

export type SetArtistFavoriteResult =
  | { ok: true; isFavorite: boolean; favoritedAt: string | null }
  | { ok: false; reason: 'limit_reached' | 'not_following' | 'unknown' };

export async function getFavoriteArtistIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_artists')
    .select('artist_id')
    .eq('user_id', userId)
    .eq('is_favorite', true);

  if (error) throw error;
  return (data ?? []).map((row) => row.artist_id as string);
}

export async function countFavoriteArtists(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_artists')
    .select('artist_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_favorite', true);

  if (error) throw error;
  return count ?? 0;
}

export async function setArtistFavorite(
  userId: string,
  artistId: string,
  isFavorite: boolean
): Promise<SetArtistFavoriteResult> {
  const { data: row, error: fetchError } = await supabase
    .from('user_artists')
    .select('is_favorite')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return { ok: false, reason: 'not_following' };

  const alreadyFavorite = Boolean(row.is_favorite);
  if (isFavorite && !canMarkArtistFavorite(await countFavoriteArtists(userId), alreadyFavorite)) {
    return { ok: false, reason: 'limit_reached' };
  }

  const favoritedAt = isFavorite ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from('user_artists')
    .update({
      is_favorite: isFavorite,
      favorited_at: favoritedAt,
    })
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .select('is_favorite, favorited_at')
    .single();

  if (error) {
    if (isFavoriteArtistsLimitError(error)) {
      return { ok: false, reason: 'limit_reached' };
    }
    throw error;
  }

  return {
    ok: true,
    isFavorite: Boolean(data.is_favorite),
    favoritedAt: (data.favorited_at as string | null) ?? null,
  };
}
