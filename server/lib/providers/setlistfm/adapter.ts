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

/** Calendar date from setlist.fm `eventDate` (dd-MM-yyyy), not derived from UTC show_date. */
export function parseSetlistFmLocalDate(eventDate: string): string {
  const [day, month, year] = eventDate.split('-').map(Number);
  if (!day || !month || !year) {
    throw new Error(`Invalid setlist.fm eventDate: ${eventDate}`);
  }
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function flattenSetlistSongs(setlist: SetlistFmSetlist): ParsedSetlistSong[] {
  const sets = asArray(setlist.sets?.set);
  const songs: ParsedSetlistSong[] = [];
  let position = 1;

  for (const set of sets) {
    const isEncore = Boolean(set.encore && set.encore > 0);
    for (const song of asArray(set.song)) {
      songs.push({
        title: song.name.trim(),
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

type SetlistFmRequestOptions = {
  /** setlist.fm returns 404 when a search has zero hits — treat as empty. */
  emptyOnNotFound?: boolean;
};

async function setlistFmRequest<T>(
  path: string,
  options: SetlistFmRequestOptions = {}
): Promise<T | null> {
  const limiter = getSharedSetlistFmRateLimiter();
  await limiter.acquire();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'x-api-key': requireApiKey(),
    },
    cache: 'no-store',
  });

  if (response.status === 404 && options.emptyOnNotFound) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`setlist.fm request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function parseSetlistSearchPage(data: SetlistFmPaginated<SetlistFmSetlist> | null): SetlistFmSetlist[] {
  if (!data) return [];
  return data.setlist ?? data.setlists ?? [];
}

export type SearchSetlistsParams = {
  artistMbid?: string;
  artistName?: string;
  date: string;
  page?: number;
};

export class SetlistFmProvider implements SetlistFmAdapter {
  async searchSetlists(params: SearchSetlistsParams): Promise<SetlistFmSetlist[]> {
    const query = new URLSearchParams({
      date: params.date,
      p: String(params.page ?? 1),
    });
    if (params.artistMbid?.trim()) {
      query.set('artistMbid', params.artistMbid.trim());
    }
    if (params.artistName?.trim()) {
      query.set('artistName', params.artistName.trim());
    }

    const data = await setlistFmRequest<SetlistFmPaginated<SetlistFmSetlist>>(
      `/1.0/search/setlists?${query.toString()}`,
      { emptyOnNotFound: true }
    );
    return parseSetlistSearchPage(data);
  }

  async searchArtistsByName(name: string, page = 1): Promise<SetlistFmArtist[]> {
    const params = new URLSearchParams({
      artistName: name,
      p: String(page),
    });
    const data = await setlistFmRequest<SetlistFmPaginated<SetlistFmArtist>>(
      `/1.0/search/artists?${params.toString()}`,
      { emptyOnNotFound: true }
    );
    return data?.artist ?? [];
  }

  async getArtistSetlists(mbid: string, page = 1): Promise<SetlistFmSetlist[]> {
    const params = new URLSearchParams({ p: String(page) });
    const data = await setlistFmRequest<SetlistFmPaginated<SetlistFmSetlist>>(
      `/1.0/artist/${mbid}/setlists?${params.toString()}`,
      { emptyOnNotFound: true }
    );
    return data?.setlist ?? [];
  }

  async getArtistSetlistsOnDate(
    mbid: string,
    eventDateDdMmYyyy: string,
    page = 1
  ): Promise<SetlistFmSetlist[]> {
    return this.searchSetlists({
      artistMbid: mbid,
      date: eventDateDdMmYyyy,
      page,
    });
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    const data = await setlistFmRequest<SetlistFmSetlist>(`/1.0/setlist/${setlistId}`);
    if (!data) {
      throw new Error(`setlist.fm setlist not found: ${setlistId}`);
    }
    return data;
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
