import { pickBestLrclibRecord, readLrclibDuration } from '../../../shared/lrclibPick';
import { parseLrc } from '../../../shared/parseLrc';

import type { LyricsSearchResponse } from './types';
import { directLrclibQueue } from './lrclibDirectQueue';

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
  fetchFn: LrclibDirectFetchFn
): Promise<LyricsSearchResponse | null> {
  const params = new URLSearchParams({
    track_name: title.trim(),
    artist_name: artist.trim(),
  });

  const response = await fetchFn(`${LRCLIB_DIRECT_BASE_URL}/search?${params.toString()}`, {
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

export async function fetchLrclibSearchDirect(
  artist: string,
  title: string,
  fetchFn: LrclibDirectFetchFn = fetch
): Promise<LyricsSearchResponse | null> {
  return directLrclibQueue.enqueue(() => fetchLrclibSearchDirectOnce(artist, title, fetchFn));
}
