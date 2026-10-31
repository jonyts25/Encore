import { parseLrc } from './lrc';
import type { Lyrics, LyricsMatch, LyricsProvider, SyncedLyrics } from './types';

const BASE_URL = 'https://lrclib.net/api';
const LRCLIB_ATTRIBUTION = 'Lyrics via LRCLIB (lrclib.net)';
const USER_AGENT = 'Encore/0.1 (https://github.com/jonyts25/Encore)';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;
const RETRY_DELAYS_MS = [0, 2000, 5000];
const MAX_CONCURRENT_LRCLIB_REQUESTS = 2;

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

type QueueTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class LrclibRequestQueue {
  private active = 0;
  private readonly queue: QueueTask<unknown>[] = [];

  constructor(private readonly maxConcurrent: number) {}

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;
      this.active += 1;
      void task
        .run()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}

const lrclibQueue = new LrclibRequestQueue(MAX_CONCURRENT_LRCLIB_REQUESTS);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterMs(maxMs: number): number {
  return Math.floor(Math.random() * maxMs);
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
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

async function lrclibFetchOnce(path: string): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
    },
    cache: 'no-store',
  });
}

async function lrclibRequestDirect<T>(path: string): Promise<T> {
  let lastTransient: Error | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const baseDelay = RETRY_DELAYS_MS[attempt] ?? 0;
    if (baseDelay > 0) {
      await sleep(baseDelay + jitterMs(400));
    }

    const response = await lrclibFetchOnce(path);

    if (response.status === 503 || response.status === 429) {
      lastTransient = new Error(`LRCLIB temporary failure (${response.status})`);
      const retryAfterMs = parseRetryAfterMs(response);
      if (retryAfterMs != null) {
        await sleep(retryAfterMs + jitterMs(400));
      }
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

async function lrclibRequest<T>(path: string): Promise<T> {
  return lrclibQueue.enqueue(() => lrclibRequestDirect<T>(path));
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
