import { getSharedSetlistFmRateLimiter } from './rate-limiter';
import type {
  ParsedSetlistSong,
  SetlistFmAdapter,
  SetlistFmArtist,
  SetlistFmPaginated,
  SetlistFmSet,
  SetlistFmSetlist,
  SetlistFmSong,
} from './types';

const BASE_URL = 'https://api.setlist.fm/rest';

function requireApiKey(): string {
  const key = process.env.SETLISTFM_API_KEY?.trim();
  if (!key) {
    throw new Error('Missing SETLISTFM_API_KEY environment variable');
  }
  return key;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function parseSetlistFmEventDate(eventDate: string): string {
  const [day, month, year] = eventDate.split('-').map(Number);
  if (!day || !month || !year) {
    throw new Error(`Invalid setlist.fm eventDate: ${eventDate}`);
  }
  const utc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utc.toISOString();
}

export function normalizeSetlistSongTitle(rawName: string | undefined | null): string | null {
  const trimmed = rawName?.trim() ?? '';
  if (!trimmed) return null;
  return trimmed;
}

export function flattenSetlistSongs(setlist: SetlistFmSetlist): ParsedSetlistSong[] {
  const sets = asArray(setlist.sets?.set);
  const songs: ParsedSetlistSong[] = [];
  let position = 1;

  for (const set of sets) {
    const isEncore = Boolean(set.encore && set.encore > 0);
    for (const song of asArray(set.song)) {
      const title = normalizeSetlistSongTitle(song.name);
      if (!title) {
        // Skip intros, interludes, unnamed tape segments, etc.
        continue;
      }

      songs.push({
        title,
        position,
        is_encore: isEncore,
        notes: buildSongNotes(song),
      });
      position += 1;
    }
  }

  return songs;
}

function buildSongNotes(song: SetlistFmSong): string | null {
  const parts: string[] = [];
  if (song.info) parts.push(song.info);
  if (song.cover?.name) parts.push(`cover: ${song.cover.name}`);
  if (song.with?.name) parts.push(`with: ${song.with.name}`);
  if (song.tape) parts.push('tape');
  return parts.length > 0 ? parts.join(' · ') : null;
}

async function setlistFmRequest<T>(path: string): Promise<T> {
  const limiter = getSharedSetlistFmRateLimiter();
  await limiter.acquire();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'x-api-key': requireApiKey(),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`setlist.fm request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export class SetlistFmProvider implements SetlistFmAdapter {
  async searchArtistsByName(name: string, page = 1): Promise<SetlistFmArtist[]> {
    const params = new URLSearchParams({
      artistName: name,
      p: String(page),
    });
    const data = await setlistFmRequest<SetlistFmPaginated<SetlistFmArtist>>(
      `/1.0/search/artists?${params.toString()}`
    );
    return data.artist ?? [];
  }

  async getArtistSetlists(mbid: string, page = 1): Promise<SetlistFmSetlist[]> {
    const params = new URLSearchParams({ p: String(page) });
    const data = await setlistFmRequest<SetlistFmPaginated<SetlistFmSetlist>>(
      `/1.0/artist/${mbid}/setlists?${params.toString()}`
    );
    return data.setlist ?? [];
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return setlistFmRequest<SetlistFmSetlist>(`/1.0/setlist/${setlistId}`);
  }
}

let sharedProvider: SetlistFmProvider | null = null;

export function getSetlistFmProvider(): SetlistFmProvider {
  if (!sharedProvider) {
    sharedProvider = new SetlistFmProvider();
  }
  return sharedProvider;
}

export function resolveArtistMbid(params: {
  dbMbid: string | null;
  artistName: string;
  searchArtistsByName: (name: string) => Promise<SetlistFmArtist[]>;
}): Promise<string> {
  return resolveArtistMbidImpl(params);
}

async function resolveArtistMbidImpl(params: {
  dbMbid: string | null;
  artistName: string;
  searchArtistsByName: (name: string) => Promise<SetlistFmArtist[]>;
}): Promise<string> {
  if (params.dbMbid?.trim()) {
    return params.dbMbid.trim();
  }

  const results = await params.searchArtistsByName(params.artistName);
  if (results.length === 0) {
    throw new Error(`No setlist.fm artist match for "${params.artistName}"`);
  }

  const normalizedTarget = params.artistName.trim().toLowerCase();
  const exact =
    results.find((artist) => artist.name.trim().toLowerCase() === normalizedTarget) ??
    results[0];

  if (!exact.mbid) {
    throw new Error(`setlist.fm artist "${exact.name}" has no MBID`);
  }

  return exact.mbid;
}
