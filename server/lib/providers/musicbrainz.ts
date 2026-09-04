import type { ArtistLinkPlatform } from '../artist-link-types';

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

const USER_AGENT = 'Encore/0.1 ( concert companion app )';

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
  const response = await fetch(
    `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(mbid)}?inc=url-rels&fmt=json`,
    {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`MusicBrainz request failed (${response.status})`);
  }

  const payload = (await response.json()) as MusicBrainzArtistResponse;
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
