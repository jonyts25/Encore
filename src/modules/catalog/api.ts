import { apiFetch } from '@/core/api/client';
import { supabase } from '@/core/api/supabase';

import type { Artist, ArtistLink, ArtistSearchResponse, UserArtist } from './types';

const ARTIST_COLUMNS = 'id, mbid, name, image_url, genres, created_at';

export async function listPublicArtists(limit = 100): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Artist[];
}

export async function getArtistById(artistId: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .eq('id', artistId)
    .maybeSingle();

  if (error) throw error;
  return data as Artist | null;
}

export function filterArtists(artists: Artist[], query: string): Artist[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return artists;

  return artists.filter((artist) => {
    const nameMatch = artist.name.toLowerCase().includes(normalized);
    const genreMatch =
      artist.genres?.some((genre) => genre.toLowerCase().includes(normalized)) ?? false;
    return nameMatch || genreMatch;
  });
}

export async function searchLocalArtists(query: string, limit = 100): Promise<Artist[]> {
  const normalized = query.trim();
  if (!normalized) return listPublicArtists(limit);

  const { data: byName, error: byNameError } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .ilike('name', `%${normalized}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (byNameError) throw byNameError;
  if ((byName ?? []).length > 0) return (byName ?? []) as Artist[];

  return filterArtists(await listPublicArtists(limit), normalized);
}

export async function searchPublicArtists(query: string, limit = 100): Promise<Artist[]> {
  return searchLocalArtists(query, limit);
}

type ArtistConfirmResponse = {
  artist: Artist;
  source: 'resolved';
};

export async function fetchArtistSearch(query: string): Promise<ArtistSearchResponse> {
  const normalized = query.trim();
  if (!normalized) {
    return { artists: [], candidates: [], source: 'none', query: '' };
  }

  return apiFetch<ArtistSearchResponse>(`/api/artists/search?q=${encodeURIComponent(normalized)}`);
}

export async function confirmArtistResolution(mbid: string): Promise<Artist> {
  const response = await apiFetch<ArtistConfirmResponse>('/api/artists/resolve-confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mbid }),
  });

  return response.artist;
}

export async function searchArtistsWithResolution(query: string, limit = 100): Promise<ArtistSearchResponse> {
  const normalized = query.trim();
  if (!normalized) {
    return { artists: await listPublicArtists(limit), candidates: [], source: 'none', query: '' };
  }

  const localMatches = await searchLocalArtists(normalized, limit);
  if (localMatches.length > 0) {
    return { artists: localMatches, candidates: [], source: 'local', query: normalized };
  }

  return fetchArtistSearch(normalized);
}

export async function getArtistFollow(
  userId: string,
  artistId: string
): Promise<UserArtist | null> {
  const { data, error } = await supabase
    .from('user_artists')
    .select('user_id, artist_id, followed_at')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();

  if (error) throw error;
  return data as UserArtist | null;
}

export async function followArtist(userId: string, artistId: string): Promise<UserArtist> {
  const followedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_artists')
    .insert({ user_id: userId, artist_id: artistId, followed_at: followedAt })
    .select('user_id, artist_id, followed_at')
    .single();

  if (error) throw error;
  return data as UserArtist;
}

export async function unfollowArtist(userId: string, artistId: string): Promise<void> {
  const { error } = await supabase
    .from('user_artists')
    .delete()
    .eq('user_id', userId)
    .eq('artist_id', artistId);

  if (error) throw error;
}

export async function fetchArtistLinks(artistId: string): Promise<ArtistLink[]> {
  const { data, error } = await supabase
    .from('artist_links')
    .select('artist_id, platform, url, source, created_at')
    .eq('artist_id', artistId)
    .order('platform');

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return (data ?? []) as ArtistLink[];
}
