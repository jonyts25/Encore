import { apiFetch, ApiError } from '@/core/api/client';
import { getCachedLyrics, setCachedLyrics } from '@/core/db';

import type { LyricsResult, LyricsSearchResponse } from './types';

function mapResponse(data: LyricsSearchResponse): LyricsResult {
  return {
    id: data.lyrics.id,
    title: data.lyrics.title,
    artist: data.lyrics.artist,
    album: data.lyrics.album,
    plainLyrics: data.lyrics.plain_lyrics,
    instrumental: data.lyrics.instrumental,
    attribution: data.attribution,
  };
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const cached = await getCachedLyrics(artist, title);
  if (cached) return cached;

  const params = new URLSearchParams({ artist, title });

  try {
    const data = await apiFetch<LyricsSearchResponse>(`/api/lyrics/search?${params.toString()}`);
    const result = mapResponse(data);
    await setCachedLyrics(artist, title, result);
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export function buildGeniusSearchUrl(artist: string, title: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://genius.com/search?q=${query}`;
}

export function buildSpotifySearchUrl(artist: string, title: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://open.spotify.com/search/${query}`;
}
