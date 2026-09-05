import type { ArtistLinkPlatform } from '../artist-link-types';

import { acquireMusicBrainzRequestSlot } from './musicbrainz-rate-limiter';

type MusicBrainzUrlRelation = {
  type?: string;
  'target-type'?: string;
  url?: {
    resource?: string;
  };
};

type MusicBrainzArtistResponse = {
  relations?: MusicBrainzUrlRelation[];
  'relation-count'?: number;
};

const URL_RELATIONS_PAGE_SIZE = 100;
const MUSICBRAINZ_MAX_RETRIES = 2;

type MusicBrainzArtistTag = {
  name?: string;
  count?: number;
};

type MusicBrainzSearchArtist = {
  id?: string;
  name?: string;
  score?: number;
  tags?: MusicBrainzArtistTag[];
  disambiguation?: string;
  country?: string;
  type?: string;
};

type MusicBrainzSearchResponse = {
  artists?: MusicBrainzSearchArtist[];
};

type MusicBrainzArtistDetail = {
  id?: string;
  name?: string;
  tags?: MusicBrainzArtistTag[];
  disambiguation?: string;
  country?: string;
  type?: string;
};

export type MusicBrainzArtistMatch = {
  mbid: string;
  name: string;
  genres: string[] | null;
};

export type MusicBrainzArtistCandidate = {
  mbid: string;
  name: string;
  score: number;
  disambiguation: string | null;
  country: string | null;
  type: string | null;
  genres: string[] | null;
};

const SEARCH_CANDIDATE_LIMIT = 10;
const MIN_CANDIDATE_SCORE = 50;
const AUTO_RESOLVE_MIN_SCORE = 95;
const AUTO_RESOLVE_MIN_GAP = 12;

const USER_AGENT = 'Encore/0.1 ( concert companion app )';

async function musicBrainzRequest<T>(path: string): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MUSICBRAINZ_MAX_RETRIES; attempt += 1) {
    await acquireMusicBrainzRequestSlot();

    const response = await fetch(`https://musicbrainz.org/ws/2${path}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      return (await response.json()) as T;
    }

    if ((response.status === 429 || response.status === 503) && attempt < MUSICBRAINZ_MAX_RETRIES) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1500 * (attempt + 1));
      });
      continue;
    }

    lastError = new Error(`MusicBrainz request failed (${response.status})`);
  }

  throw lastError ?? new Error('MusicBrainz request failed');
}

function extractGenresFromTags(tags: MusicBrainzArtistTag[] | undefined): string[] | null {
  if (!tags?.length) return null;

  const genres = tags
    .filter((tag) => tag.name && (tag.count ?? 0) > 0)
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .slice(0, 8)
    .map((tag) => tag.name!.trim())
    .filter(Boolean);

  return genres.length > 0 ? genres : null;
}

function mapSearchArtistToCandidate(artist: MusicBrainzSearchArtist): MusicBrainzArtistCandidate | null {
  if (!artist.id?.trim() || !artist.name?.trim()) return null;

  return {
    mbid: artist.id.trim(),
    name: artist.name.trim(),
    score: artist.score ?? 0,
    disambiguation: artist.disambiguation?.trim() || null,
    country: artist.country?.trim() || null,
    type: artist.type?.trim() || null,
    genres: extractGenresFromTags(artist.tags),
  };
}

function namesMatch(searchName: string, artistName: string): boolean {
  return searchName.trim().toLowerCase() === artistName.trim().toLowerCase();
}

export function pickAutoResolvableCandidate(
  candidates: MusicBrainzArtistCandidate[],
  searchName: string
): MusicBrainzArtistCandidate | null {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const second = sorted[1];

  if (!namesMatch(searchName, best.name)) return null;
  if (best.score < AUTO_RESOLVE_MIN_SCORE) return null;
  if (second && best.score - second.score < AUTO_RESOLVE_MIN_GAP) return null;

  return best;
}

export function filterAmbiguousCandidates(
  candidates: MusicBrainzArtistCandidate[]
): MusicBrainzArtistCandidate[] {
  return candidates
    .filter((candidate) => candidate.score >= MIN_CANDIDATE_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, SEARCH_CANDIDATE_LIMIT);
}

export async function searchMusicBrainzArtistCandidates(
  name: string,
  limit = SEARCH_CANDIDATE_LIMIT
): Promise<MusicBrainzArtistCandidate[]> {
  const trimmedName = name.trim();
  if (!trimmedName) return [];

  const params = new URLSearchParams({
    query: `artist:"${trimmedName}"`,
    fmt: 'json',
    limit: String(limit),
  });

  const payload = await musicBrainzRequest<MusicBrainzSearchResponse>(`/artist/?${params.toString()}`);
  return (payload.artists ?? [])
    .map(mapSearchArtistToCandidate)
    .filter((candidate): candidate is MusicBrainzArtistCandidate => candidate !== null);
}

export async function fetchMusicBrainzArtistByMbid(mbid: string): Promise<MusicBrainzArtistMatch | null> {
  const trimmedMbid = mbid.trim();
  if (!trimmedMbid) return null;

  const payload = await musicBrainzRequest<MusicBrainzArtistDetail>(
    `/artist/${encodeURIComponent(trimmedMbid)}?inc=tags&fmt=json`
  );

  if (!payload.id?.trim() || !payload.name?.trim()) return null;

  return {
    mbid: payload.id.trim(),
    name: payload.name.trim(),
    genres: extractGenresFromTags(payload.tags),
  };
}

/** @deprecated Use searchMusicBrainzArtistCandidates + pickAutoResolvableCandidate */
export async function searchMusicBrainzArtists(name: string): Promise<MusicBrainzArtistMatch | null> {
  const candidates = await searchMusicBrainzArtistCandidates(name, 5);
  const autoMatch = pickAutoResolvableCandidate(candidates, name);
  if (!autoMatch) return null;

  return {
    mbid: autoMatch.mbid,
    name: autoMatch.name,
    genres: autoMatch.genres,
  };
}

function hostnameIncludes(url: string, fragment: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes(fragment);
  } catch {
    return url.toLowerCase().includes(fragment);
  }
}

export function mapMusicBrainzUrlToPlatform(url: string, relationType?: string): ArtistLinkPlatform | null {
  const normalizedType = (relationType ?? '').toLowerCase();

  if (hostnameIncludes(url, 'open.spotify.com')) return 'spotify';
  if (hostnameIncludes(url, 'music.apple.com') || hostnameIncludes(url, 'itunes.apple.com')) {
    return 'apple_music';
  }
  if (hostnameIncludes(url, 'youtube.com') || hostnameIncludes(url, 'youtu.be')) return 'youtube';
  if (hostnameIncludes(url, 'instagram.com')) return 'instagram';
  if (hostnameIncludes(url, 'tiktok.com')) return 'tiktok';

  if (normalizedType.includes('official homepage') || normalizedType.includes('official site')) {
    return 'website';
  }

  return null;
}

export async function fetchMusicBrainzArtistUrlRelations(mbid: string): Promise<MusicBrainzUrlRelation[]> {
  const trimmedMbid = mbid.trim();
  if (!trimmedMbid) return [];

  const allRelations: MusicBrainzUrlRelation[] = [];
  let offset = 0;

  while (true) {
    const payload = await musicBrainzRequest<MusicBrainzArtistResponse>(
      `/artist/${encodeURIComponent(trimmedMbid)}?inc=url-rels&fmt=json&limit=${URL_RELATIONS_PAGE_SIZE}&offset=${offset}`
    );

    const batch = payload.relations ?? [];
    allRelations.push(...batch);

    const totalCount = payload['relation-count'] ?? batch.length;
    offset += batch.length;

    if (batch.length === 0 || offset >= totalCount || batch.length < URL_RELATIONS_PAGE_SIZE) {
      break;
    }
  }

  return allRelations;
}

export function extractArtistLinksFromRelations(
  relations: MusicBrainzUrlRelation[]
): Array<{ platform: ArtistLinkPlatform; url: string }> {
  const byPlatform = new Map<ArtistLinkPlatform, string>();

  for (const relation of relations) {
    const url = relation.url?.resource?.trim();
    if (!url) continue;

    const platform = mapMusicBrainzUrlToPlatform(url, relation.type);
    if (!platform || byPlatform.has(platform)) continue;
    byPlatform.set(platform, url);
  }

  return Array.from(byPlatform.entries()).map(([platform, url]) => ({ platform, url }));
}
