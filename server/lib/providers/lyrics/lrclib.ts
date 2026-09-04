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

function mapMatch(record: LrclibRecord): LyricsMatch {
  return {
    id: String(record.id),
    title: record.trackName ?? record.name ?? 'Unknown',
    artist: record.artistName ?? 'Unknown',
    album: record.albumName ?? null,
    duration: typeof record.duration === 'number' ? record.duration : null,
    instrumental: Boolean(record.instrumental),
    hasPlainLyrics: Boolean(record.plainLyrics?.trim()),
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
    const record = await lrclibRequest<LrclibRecord>(`/get/${encodeURIComponent(id)}`);
    return mapLyrics(record);
  }

  async fetchSynced(id: string): Promise<SyncedLyrics | null> {
    const record = await lrclibRequest<LrclibRecord>(`/get/${encodeURIComponent(id)}`);
    const lrc = record.syncedLyrics?.trim();
    if (!lrc) return null;

    return {
      id: String(record.id),
      lrc,
      attribution: this.attribution,
    };
  }
}

export const LRCLIB_PROVIDER = new LrclibProvider();

export function getLyricsProvider(): LyricsProvider {
  return LRCLIB_PROVIDER;
}
