import { pickBestLrclibRecord, readLrclibDuration } from '../../../shared/lrclibPick';
import { parseLrc } from '../../../shared/parseLrc';

import type { LyricsSearchResponse } from './types';
import { directLrclibQueue } from './lrclibDirectQueue';
import {
  LRCLIB_DIRECT_MAX_ATTEMPTS,
  LRCLIB_DIRECT_RETRY_JITTER_MAX_MS,
  parseRetryAfterMs,
  retryDelayMs,
  shouldRetryDirectLrclibResponse,
} from './lrclibDirectRetry';

export const LRCLIB_DIRECT_BASE_URL = 'https://lrclib.net/api';
export const LRCLIB_CLIENT_HEADER = 'Encore/1.0 (https://github.com/jonyts25/Encore)';
export const LRCLIB_DIRECT_ATTRIBUTION = 'Lyrics via LRCLIB (lrclib.net)';
export const LRCLIB_DIRECT_TIMEOUT_MS = 10_000;

type LrclibRecord = {
  id: number;
  trackName?: string;
  name?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

export type LrclibDirectFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export type LrclibDirectSearchOptions = {
  fetchFn?: LrclibDirectFetchFn;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  jitterMs?: (maxExclusive: number) => number;
};

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultJitter(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function mapRecordToSearchResponse(record: LrclibRecord): LyricsSearchResponse {
  const plain = record.plainLyrics?.trim() ?? '';
  const syncedLines = parseLrc(record.syncedLyrics?.trim() ?? '');
  const durationSeconds = readLrclibDuration(record);

  return {
    lyrics: {
      id: String(record.id),
      title: record.trackName ?? record.name ?? 'Unknown',
      artist: record.artistName ?? 'Unknown',
      album: record.albumName ?? null,
      plain_lyrics: plain,
      instrumental: Boolean(record.instrumental),
      duration_seconds: durationSeconds,
      synced_lines: syncedLines,
    },
    attribution: LRCLIB_DIRECT_ATTRIBUTION,
  };
}

async function fetchLrclibSearchDirectOnce(
  artist: string,
  title: string,
  options?: LrclibDirectSearchOptions
): Promise<LyricsSearchResponse | null> {
  const fetchFn = options?.fetchFn ?? fetch;
  const nowFn = options?.now ?? Date.now;
  const sleep = options?.sleep ?? defaultSleep;
  const jitterMs = options?.jitterMs ?? defaultJitter;

  const params = new URLSearchParams({
    track_name: title.trim(),
    artist_name: artist.trim(),
  });
  const url = `${LRCLIB_DIRECT_BASE_URL}/search?${params.toString()}`;

  for (let attempt = 0; attempt < LRCLIB_DIRECT_MAX_ATTEMPTS; attempt += 1) {
    const response = await fetchFn(url, {
      headers: {
        Accept: 'application/json',
        'Lrclib-Client': LRCLIB_CLIENT_HEADER,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(LRCLIB_DIRECT_TIMEOUT_MS),
    });

    if (response.status === 404) {
      return null;
    }

    const retryAfterMs = parseRetryAfterMs(response, nowFn());
    if (
      shouldRetryDirectLrclibResponse(response.status, retryAfterMs, attempt, LRCLIB_DIRECT_MAX_ATTEMPTS)
    ) {
      await sleep(retryDelayMs(retryAfterMs!, jitterMs(LRCLIB_DIRECT_RETRY_JITTER_MAX_MS)));
      continue;
    }

    if (!response.ok) {
      throw new Error(`LRCLIB direct search failed (${response.status})`);
    }

    const records = (await response.json()) as LrclibRecord[];
    const best = pickBestLrclibRecord(records ?? []);
    if (!best) {
      return null;
    }

    return mapRecordToSearchResponse(best as LrclibRecord);
  }

  throw new Error('LRCLIB direct search exhausted retries');
}

export async function fetchLrclibSearchDirect(
  artist: string,
  title: string,
  options?: LrclibDirectSearchOptions
): Promise<LyricsSearchResponse | null> {
  return directLrclibQueue.enqueue(() => fetchLrclibSearchDirectOnce(artist, title, options));
}
