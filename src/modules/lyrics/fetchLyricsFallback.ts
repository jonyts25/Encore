import { ApiError } from '@/core/api/client';

import { fetchLrclibSearchDirect } from './lrclibDirect';
import type { LyricsResult } from './types';

export function shouldTryDirectLrclibFallback(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 408) return true;
    const body = error.body as { error?: string } | null;
    if (error.status === 503 && body?.error === 'lyrics_busy') return true;
  }
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

type DirectFallbackOptions = {
  expiresAt?: number;
  mapResponse: (data: import('./types').LyricsSearchResponse) => LyricsResult;
  setCached: (artist: string, title: string, result: LyricsResult, options?: { expiresAt?: number }) => Promise<void>;
  fetchDirect?: typeof fetchLrclibSearchDirect;
};

/** Returns undefined when direct LRCLIB also failed (caller should surface server error). */
export async function tryDirectLrclibFallback(
  artist: string,
  title: string,
  options: DirectFallbackOptions
): Promise<LyricsResult | null | undefined> {
  const fetchDirect = options.fetchDirect ?? fetchLrclibSearchDirect;
  try {
    const data = await fetchDirect(artist, title);
    if (!data) {
      return null;
    }
    const result = options.mapResponse(data);
    await options.setCached(artist, title, result, { expiresAt: options.expiresAt });
    return result;
  } catch {
    return undefined;
  }
}
