import { parseLrc } from './lrc';
import type { Lyrics, LyricsMatch, LyricsProvider, SyncedLyrics } from './types';

const BASE_URL = 'https://lrclib.net/api';
const LRCLIB_ATTRIBUTION = 'Lyrics via LRCLIB (lrclib.net)';
const USER_AGENT = 'Encore/0.1 (https://github.com/jonyts25/Encore)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;
const RETRY_DELAYS_MS = [0, 1000, 3000];

export class LyricsBusyError extends Error {
  readonly code = 'lyrics_busy';

  constructor() {
    super('Lyrics service is busy');
    this.name = 'LyricsBusyError';
  }
}

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

export type ResolvedLyricsSearch = {
  lyrics: Lyrics;
  synced: SyncedLyrics | null;
  matches: LyricsMatch[];
};

type CacheEntry = {
  value: ResolvedLyricsSearch;
  cachedAt: number;
};

const lyricsCache = new Map<string, CacheEntry>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(artist: string, title: string): string {
  return `${artist.trim().toLowerCase()}|${title.trim().toLowerCase()}`;
}

function trimCacheIfNeeded() {
  while (lyricsCache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = lyricsCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    lyricsCache.delete(oldestKey);
  }
}

function readDuration(record: LrclibRecord): number | null {
  return typeof record.duration === 'number' && record.duration > 0 ? record.duration : null;
}

function mapMatch(record: LrclibRecord): LyricsMatch {
  return {
    id: String(record.id),
    title: record.trackName ?? record.name ?? 'Unknown',
    artist: record.artistName ?? 'Unknown',
    album: record.albumName ?? null,
    duration: readDuration(record),
    instrumental: Boolean(record.instrumental),
    hasPlainLyrics: Boolean(record.plainLyrics?.trim()),
    hasSyncedLyrics: Boolean(record.syncedLyrics?.trim()),
  };
}

function mapLyrics(record: LrclibRecord): Lyrics {
  const plainLyrics = record.plainLyrics?.trim() ?? '';
  if (!plainLyrics) {
    throw new Error('Lyrics record has no plain text');
  }

  return {
    id: String(record.id),
    title: record.trackName ?? record.name ?? 'Unknown',
    artist: record.artistName ?? 'Unknown',
    album: record.albumName ?? null,
    plainLyrics,
    instrumental: Boolean(record.instrumental),
    durationSeconds: readDuration(record),
    attribution: LRCLIB_ATTRIBUTION,
  };
}

function mapSynced(record: LrclibRecord): SyncedLyrics | null {
  const lrc = record.syncedLyrics?.trim();
  if (!lrc) return null;

  const lines = parseLrc(lrc);
  if (lines.length === 0) return null;

  return {
    id: String(record.id),
    lrc,
    lines,
    durationSeconds: readDuration(record),
    attribution: LRCLIB_ATTRIBUTION,
  };
}

async function lrclibRequest<T>(path: string): Promise<T> {
  let lastTransient: Error | null = null;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
    });

    if (response.status === 503 || response.status === 429) {
      lastTransient = new Error(`LRCLIB temporary failure (${response.status})`);
      continue;
    }

    if (response.status === 404) {
      throw new Error('Lyrics not found');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LRCLIB request failed (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  }

  if (lastTransient) {
    throw new LyricsBusyError();
  }

  throw new LyricsBusyError();
}

function pickBestRecord(records: LrclibRecord[]): LrclibRecord | null {
  const withLyrics = records.filter((record) => Boolean(record.plainLyrics?.trim()));
  if (withLyrics.length === 0) return null;

  return (
    withLyrics.find((record) => Boolean(record.syncedLyrics?.trim())) ??
    withLyrics.find((record) => readDuration(record) !== null) ??
    withLyrics[0]
  );
}

export async function resolveLyricsSearch(
  artist: string,
  title: string
): Promise<ResolvedLyricsSearch> {
  const key = cacheKey(artist, title);
  const cached = lyricsCache.get(key);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const params = new URLSearchParams({
    track_name: title.trim(),
    artist_name: artist.trim(),
  });

  const records = await lrclibRequest<LrclibRecord[]>(`/search?${params.toString()}`);
  const matches = (records ?? []).map(mapMatch);
  const best = pickBestRecord(records ?? []);

  if (!best) {
    throw new Error('Lyrics not found');
  }

  const value: ResolvedLyricsSearch = {
    lyrics: mapLyrics(best),
    synced: mapSynced(best),
    matches: matches.filter((match) => match.hasPlainLyrics),
  };

  lyricsCache.set(key, { value, cachedAt: Date.now() });
  trimCacheIfNeeded();

  return value;
}

async function fetchRecord(id: string): Promise<LrclibRecord> {
  return lrclibRequest<LrclibRecord>(`/get/${encodeURIComponent(id)}`);
}

export class LrclibProvider implements LyricsProvider {
  readonly attribution = LRCLIB_ATTRIBUTION;
  readonly allowsCommercialUse = false;

  async search(artist: string, title: string): Promise<LyricsMatch[]> {
    const resolved = await resolveLyricsSearch(artist, title);
    return resolved.matches;
  }

  async fetch(id: string): Promise<Lyrics> {
    const record = await fetchRecord(id);
    return mapLyrics(record);
  }

  async fetchSynced(id: string): Promise<SyncedLyrics | null> {
    const record = await fetchRecord(id);
    return mapSynced(record);
  }
}

export const LRCLIB_PROVIDER = new LrclibProvider();

export function getLyricsProvider(): LyricsProvider {
  return LRCLIB_PROVIDER;
}
