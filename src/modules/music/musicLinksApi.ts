import { getApiBaseUrl } from '@/core/api/config';

export type MusicPlatformLinks = {
  youtubeMusic: string | null;
  spotify: string | null;
  youtube: string | null;
};

type MusicLinksApiResponse = {
  links?: {
    youtubeMusic?: string | null;
    spotify?: string | null;
    youtube?: string | null;
  };
  error?: string;
};

export async function fetchMusicLinksByAppleUrl(appleUrl: string): Promise<MusicPlatformLinks> {
  const url = new URL('/api/music/links', getApiBaseUrl());
  url.searchParams.set('appleUrl', appleUrl);

  const response = await fetch(url.toString());
  const body = (await response.json()) as MusicLinksApiResponse;

  if (!response.ok) {
    throw new Error(body.error ?? `music_links_${response.status}`);
  }

  return {
    youtubeMusic: body.links?.youtubeMusic ?? null,
    spotify: body.links?.spotify ?? null,
    youtube: body.links?.youtube ?? null,
  };
}
