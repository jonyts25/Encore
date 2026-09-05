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
};

type MusicBrainzArtistTag = {
  name?: string;
  count?: number;
};

type MusicBrainzSearchArtist = {
  id?: string;
  name?: string;
  score?: number;
  tags?: MusicBrainzArtistTag[];
};

type MusicBrainzSearchResponse = {
  artists?: MusicBrainzSearchArtist[];
};

export type MusicBrainzArtistMatch = {
  mbid: string;
  name: string;
  genres: string[] | null;
};

const USER_AGENT = 'Encore/0.1 ( concert companion app )';

async function musicBrainzRequest<T>(path: string): Promise<T> {
  await acquireMusicBrainzRequestSlot();

  const response = await fetch(`https://musicbrainz.org/ws/2${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz request failed (${response.status})`);
  }

  return (await response.json()) as T;
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

function pickBestArtistMatch(
  artists: MusicBrainzSearchArtist[],
  searchName: string
): MusicBrainzSearchArtist | null {
  if (artists.length === 0) return null;

  const normalizedTarget = searchName.trim().toLowerCase();
  const exact = artists.find((artist) => artist.name?.trim().toLowerCase() === normalizedTarget);
  if (exact) return exact;

  return artists.reduce<MusicBrainzSearchArtist | null>((best, current) => {
    if (!best) return current;
    return (current.score ?? 0) > (best.score ?? 0) ? current : best;
  }, null);
}

export async function searchMusicBrainzArtists(name: string): Promise<MusicBrainzArtistMatch | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const params = new URLSearchParams({
    query: `artist:"${trimmedName}"`,
    fmt: 'json',
    limit: '5',
  });

  const payload = await musicBrainzRequest<MusicBrainzSearchResponse>(`/artist/?${params.toString()}`);
  const match = pickBestArtistMatch(payload.artists ?? [], trimmedName);
  if (!match?.id?.trim() || !match.name?.trim()) return null;

  return {
    mbid: match.id.trim(),
    name: match.name.trim(),
    genres: extractGenresFromTags(match.tags),
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
  const payload = await musicBrainzRequest<MusicBrainzArtistResponse>(
    `/artist/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`
  );
  return payload.relations ?? [];
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
