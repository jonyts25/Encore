type ItunesSearchResponse = {
  resultCount?: number;
  results?: Array<{
    trackViewUrl?: string;
    artistViewUrl?: string;
    collectionViewUrl?: string;
  }>;
};

const songUrlCache = new Map<string, string>();
const artistUrlCache = new Map<string, string>();

const ITUNES_SEARCH = 'https://itunes.apple.com/search';

function cacheKey(parts: string[]): string {
  return parts.map((part) => part.trim().toLowerCase()).join('\0');
}

async function fetchItunes(params: Record<string, string>): Promise<ItunesSearchResponse> {
  const url = new URL(ITUNES_SEARCH);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`iTunes search failed (${response.status})`);
  }
  return (await response.json()) as ItunesSearchResponse;
}

/** Opens a specific track when possible; falls back to the artist page. */
export async function resolveAppleMusicSongUrl(artist: string, title: string): Promise<string> {
  const key = cacheKey(['song', artist, title]);
  const cached = songUrlCache.get(key);
  if (cached) return cached;

  const term = `${artist.trim()} ${title.trim()}`.trim();
  const data = await fetchItunes({
    term,
    entity: 'song',
    country: 'mx',
    limit: '1',
  });

  const trackUrl = data.results?.[0]?.trackViewUrl;
  if (trackUrl) {
    songUrlCache.set(key, trackUrl);
    return trackUrl;
  }

  const artistUrl = await resolveAppleMusicArtistUrl(artist);
  songUrlCache.set(key, artistUrl);
  return artistUrl;
}

/** Artist page on Apple Music (setlist / fallback). */
export async function resolveAppleMusicArtistUrl(artist: string): Promise<string> {
  const key = cacheKey(['artist', artist]);
  const cached = artistUrlCache.get(key);
  if (cached) return cached;

  const data = await fetchItunes({
    term: artist.trim(),
    entity: 'musicArtist',
    country: 'mx',
    limit: '1',
  });

  const artistUrl =
    data.results?.[0]?.artistViewUrl ??
    data.results?.[0]?.collectionViewUrl ??
    `https://music.apple.com/mx/search?term=${encodeURIComponent(artist.trim())}`;

  artistUrlCache.set(key, artistUrl);
  return artistUrl;
}

/** @internal test helper */
export function clearAppleMusicItunesCacheForTests(): void {
  songUrlCache.clear();
  artistUrlCache.clear();
}
