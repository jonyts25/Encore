import { ApiError } from '@/core/api/client';

export class LyricsBusyError extends Error {
  constructor() {
    super('lyrics_busy');
    this.name = 'LyricsBusyError';
  }
}

export function isLyricsNetworkFailure(error: unknown): boolean {
  if (error instanceof LyricsBusyError) return true;
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 502 || error.status === 503;
  }
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export function toLyricsFetchError(error: unknown): Error {
  if (error instanceof LyricsBusyError) return error;
  if (error instanceof ApiError) {
    const body = error.body as { error?: string } | null;
    if (error.status === 503 && body?.error === 'lyrics_busy') {
      return new LyricsBusyError();
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
