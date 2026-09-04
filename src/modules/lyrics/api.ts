import { apiFetch, ApiError } from '@/core/api/client';
import { getCachedLyrics, setCachedLyrics } from '@/core/db';

import {
  detectScrollMode,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
} from './scrollLogic';
import type { LyricsResult, LyricsSearchResponse } from './types';

function normalizeLyricsResult(
  data: LyricsSearchResponse['lyrics'],
  attribution: string
): LyricsResult {
  const syncedLines = normalizeSyncedLines(data.synced_lines);
  const plainLyrics = normalizePlainLyrics(data.plain_lyrics);
  const durationSeconds = normalizeDurationSeconds(data.duration_seconds);

  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    album: data.album ?? null,
    plainLyrics,
    instrumental: Boolean(data.instrumental),
    attribution,
    durationSeconds,
    syncedLines,
    scrollMode: detectScrollMode(syncedLines, durationSeconds),
  };
}

function normalizeCachedResult(cached: LyricsResult): LyricsResult {
  const syncedLines = normalizeSyncedLines(cached.syncedLines);
  const plainLyrics = normalizePlainLyrics(cached.plainLyrics);
  const durationSeconds = normalizeDurationSeconds(cached.durationSeconds);

  return {
    ...cached,
    plainLyrics,
    durationSeconds,
    syncedLines,
    scrollMode: detectScrollMode(syncedLines, durationSeconds),
  };
}

function mapResponse(data: LyricsSearchResponse): LyricsResult {
  return normalizeLyricsResult(data.lyrics, data.attribution);
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const cached = await getCachedLyrics(artist, title);
  if (cached) return normalizeCachedResult(cached);

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
