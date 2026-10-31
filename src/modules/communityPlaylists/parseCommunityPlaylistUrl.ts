import type { MusicStreamingService } from '@/modules/music/streamingLinks';

export const COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE =
  'Pega el link de una playlist de Apple Music, Spotify o YouTube Music';

export type ParsedCommunityPlaylistUrl = {
  url: string;
  service: MusicStreamingService;
};

export type ParseCommunityPlaylistUrlResult =
  | { ok: true; value: ParsedCommunityPlaylistUrl }
  | { ok: false; message: typeof COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };

function normalizeInput(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function stripTrackingSearchParams(url: URL): void {
  const keysToRemove: string[] = [];
  url.searchParams.forEach((_, key) => {
    if (key === 'si' || key.startsWith('utm_')) {
      keysToRemove.push(key);
    }
  });
  for (const key of keysToRemove) {
    url.searchParams.delete(key);
  }
}

function hostnameMatches(host: string, expected: string): boolean {
  return host === expected || host.endsWith(`.${expected}`);
}

export function parseCommunityPlaylistUrl(raw: string): ParseCommunityPlaylistUrlResult {
  const url = normalizeInput(raw);
  if (!url) {
    return { ok: false, message: COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };
  }

  const host = url.hostname.toLowerCase();

  if (hostnameMatches(host, 'music.apple.com')) {
    if (!url.pathname.includes('/playlist/')) {
      return { ok: false, message: COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };
    }
    stripTrackingSearchParams(url);
    return { ok: true, value: { url: url.toString(), service: 'apple_music' } };
  }

  if (host === 'open.spotify.com') {
    if (!url.pathname.startsWith('/playlist/')) {
      return { ok: false, message: COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };
    }
    stripTrackingSearchParams(url);
    return { ok: true, value: { url: url.toString(), service: 'spotify' } };
  }

  if (hostnameMatches(host, 'music.youtube.com') || hostnameMatches(host, 'youtube.com')) {
    if (!url.pathname.includes('/playlist') || !url.searchParams.get('list')) {
      return { ok: false, message: COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };
    }
    stripTrackingSearchParams(url);
    return { ok: true, value: { url: url.toString(), service: 'youtube_music' } };
  }

  return { ok: false, message: COMMUNITY_PLAYLIST_INVALID_URL_MESSAGE };
}
