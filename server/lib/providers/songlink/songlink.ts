import { createSupabaseAdminClient } from '@/lib/supabase';

import { songlinkRateLimiter } from './rate-limiter';
import { parseSonglinkResponse, type SonglinkPlatformLinks } from './parseSonglinkResponse';

export type { SonglinkPlatformLinks };

const memoryCache = new Map<string, { links: SonglinkPlatformLinks; fetchedAt: number }>();

const MEMORY_TTL_MS = 60 * 60 * 1000;

async function readDbCache(appleUrl: string): Promise<SonglinkPlatformLinks | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('song_links')
    .select('youtube_music_url, spotify_url, youtube_url, fetched_at')
    .eq('apple_url', appleUrl)
    .maybeSingle();

  if (error || !data) return null;

  return {
    youtubeMusic: data.youtube_music_url ?? null,
    spotify: data.spotify_url ?? null,
    youtube: data.youtube_url ?? null,
  };
}

async function writeDbCache(appleUrl: string, links: SonglinkPlatformLinks): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('song_links').upsert(
    {
      apple_url: appleUrl,
      youtube_music_url: links.youtubeMusic,
      spotify_url: links.spotify,
      youtube_url: links.youtube,
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'apple_url' }
  );
  if (error) {
    console.warn('[songlink] failed to persist cache', error.message);
  }
}

async function fetchFromSonglink(appleUrl: string): Promise<SonglinkPlatformLinks> {
  return songlinkRateLimiter.run(async () => {
    const url = new URL('https://api.song.link/v1-alpha.1/links');
    url.searchParams.set('url', appleUrl);
    url.searchParams.set('userCountry', 'MX');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`song.link request failed (${response.status})`);
    }

    const payload = (await response.json()) as Parameters<typeof parseSonglinkResponse>[0];
    return parseSonglinkResponse(payload);
  });
}

export async function resolveSonglinkByAppleUrl(appleUrl: string): Promise<SonglinkPlatformLinks> {
  const normalized = appleUrl.trim();
  if (!normalized) {
    throw new Error('appleUrl is required');
  }

  const mem = memoryCache.get(normalized);
  if (mem && Date.now() - mem.fetchedAt < MEMORY_TTL_MS) {
    return mem.links;
  }

  try {
    const fromDb = await readDbCache(normalized);
    if (fromDb) {
      memoryCache.set(normalized, { links: fromDb, fetchedAt: Date.now() });
      return fromDb;
    }
  } catch (error) {
    console.warn('[songlink] db read skipped', error);
  }

  const links = await fetchFromSonglink(normalized);
  memoryCache.set(normalized, { links, fetchedAt: Date.now() });

  try {
    await writeDbCache(normalized, links);
  } catch {
    // Non-fatal when migration is not applied yet.
  }

  return links;
}

/** @internal */
export function clearSonglinkMemoryCacheForTests(): void {
  memoryCache.clear();
}
