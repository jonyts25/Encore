import { apiFetch, ApiError } from '@/core/api/client';

import { LyricsBusyError, toLyricsFetchError } from './errors';
import { shouldTryDirectLrclibFallback, tryDirectLrclibFallback } from './fetchLyricsFallback';
import {
  isLyricsServerCircuitOpen,
  recordLyricsServerBusy,
  recordLyricsServerNonBusyFailure,
  recordLyricsServerSuccess,
  shouldBypassLyricsServer,
} from './lyricsServerCircuitBreaker';
import { getCachedLyrics, setCachedLyrics } from '@/core/db';

import {
  detectScrollMode,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
} from './scrollLogic';
import type { LyricsMatchSummary, LyricsResult, LyricsSearchResponse } from './types';

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

type FetchLyricsOptions = {
  expiresAt?: number;
};

function isLyricsBusyApiError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  const body = error.body as { error?: string } | null;
  return error.status === 503 && body?.error === 'lyrics_busy';
}

async function fetchLyricsViaDirect(
  artist: string,
  title: string,
  options?: FetchLyricsOptions
): Promise<LyricsResult | null | undefined> {
  return tryDirectLrclibFallback(artist, title, {
    expiresAt: options?.expiresAt,
    mapResponse,
    setCached: setCachedLyrics,
  });
}

async function fetchLyricsFromServer(
  artist: string,
  title: string,
  options?: FetchLyricsOptions
): Promise<LyricsResult | null> {
  const params = new URLSearchParams({ artist, title });

  try {
    const data = await apiFetch<LyricsSearchResponse>(`/api/lyrics/search?${params.toString()}`);
    recordLyricsServerSuccess();
    const result = mapResponse(data);
    await setCachedLyrics(artist, title, result, { expiresAt: options?.expiresAt });
    return result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      recordLyricsServerNonBusyFailure();
      return null;
    }

    if (isLyricsBusyApiError(error)) {
      recordLyricsServerBusy();
    } else if (error instanceof ApiError) {
      recordLyricsServerNonBusyFailure();
    }

    if (shouldTryDirectLrclibFallback(error)) {
      const direct = await fetchLyricsViaDirect(artist, title, options);
      if (direct !== undefined) {
        return direct;
      }
    }

    const fallback = await getCachedLyrics(artist, title);
    if (fallback) {
      return normalizeCachedResult(fallback);
    }
    throw toLyricsFetchError(error);
  }
}

export async function fetchLyrics(
  artist: string,
  title: string,
  options?: FetchLyricsOptions
): Promise<LyricsResult | null> {
  const cached = await getCachedLyrics(artist, title);
  if (cached) {
    if (options?.expiresAt != null) {
      await setCachedLyrics(artist, title, cached, { expiresAt: options.expiresAt });
    }
    return normalizeCachedResult(cached);
  }

  if (shouldBypassLyricsServer()) {
    const direct = await fetchLyricsViaDirect(artist, title, options);
    if (direct !== undefined) {
      return direct;
    }
    throw new LyricsBusyError();
  }

  return fetchLyricsFromServer(artist, title, options);
}

export async function searchLyricsMatches(
  artist: string,
  titleQuery: string
): Promise<LyricsMatchSummary[]> {
  const trimmedArtist = artist.trim();
  const trimmedTitle = titleQuery.trim();
  if (!trimmedArtist || !trimmedTitle) return [];

  const params = new URLSearchParams({ artist: trimmedArtist, title: trimmedTitle });

  try {
    const data = await apiFetch<LyricsSearchResponse>(`/api/lyrics/search?${params.toString()}`);
    const matches = data.matches ?? [];
    return matches
      .filter((match) => match.hasPlainLyrics !== false)
      .map((match) => ({
        id: match.id,
        title: match.title,
        artist: match.artist,
        album: match.album ?? null,
      }));
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 503)) {
      return [];
    }
    throw toLyricsFetchError(error);
  }
}

export { LyricsBusyError, isLyricsBusyError, isLyricsNetworkFailure } from './errors';
export { isLyricsServerCircuitOpen, getShowPackLyricsBatchSize } from './lyricsServerCircuitBreaker';

export function buildGeniusSearchUrl(artist: string, title: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://genius.com/search?q=${query}`;
}

export function buildSpotifySearchUrl(artist: string, title: string): string {
  const query = encodeURIComponent(`${artist} ${title}`);
  return `https://open.spotify.com/search/${query}`;
}
