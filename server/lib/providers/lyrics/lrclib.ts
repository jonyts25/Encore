import { parseLrc } from './lrc';
import type { Lyrics, LyricsMatch, LyricsProvider, SyncedLyrics } from './types';

const BASE_URL = 'https://lrclib.net/api';
const LRCLIB_ATTRIBUTION = 'Lyrics via LRCLIB (lrclib.net)';

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

async function lrclibRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    throw new Error('Lyrics not found');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LRCLIB request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

async function fetchRecord(id: string): Promise<LrclibRecord> {
  return lrclibRequest<LrclibRecord>(`/get/${encodeURIComponent(id)}`);
}

export class LrclibProvider implements LyricsProvider {
  readonly attribution = LRCLIB_ATTRIBUTION;
  readonly allowsCommercialUse = false;

  async search(artist: string, title: string): Promise<LyricsMatch[]> {
    const params = new URLSearchParams({
      track_name: title.trim(),
      artist_name: artist.trim(),
    });

    const records = await lrclibRequest<LrclibRecord[]>(`/search?${params.toString()}`);
    return (records ?? []).map(mapMatch);
  }

  async fetch(id: string): Promise<Lyrics> {
    const record = await fetchRecord(id);
    return mapLyrics(record);
  }

  async fetchSynced(id: string): Promise<SyncedLyrics | null> {
    const record = await fetchRecord(id);
    const lrc = record.syncedLyrics?.trim();
    if (!lrc) return null;

    const lines = parseLrc(lrc);
    if (lines.length === 0) return null;

    return {
      id: String(record.id),
      lrc,
      lines,
      durationSeconds: readDuration(record),
      attribution: this.attribution,
    };
  }
}

export const LRCLIB_PROVIDER = new LrclibProvider();

export function getLyricsProvider(): LyricsProvider {
  return LRCLIB_PROVIDER;
}
