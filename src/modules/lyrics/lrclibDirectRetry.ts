export const LRCLIB_DIRECT_MAX_RETRY_AFTER_MS = 5000;
export const LRCLIB_DIRECT_MAX_ATTEMPTS = 3;
export const LRCLIB_DIRECT_RETRY_JITTER_MAX_MS = 400;

export function parseRetryAfterMs(response: Response, now = Date.now()): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - now);
  }
  return null;
}

export function retryDelayMs(retryAfterMs: number, jitterMs: number): number {
  return retryAfterMs + jitterMs;
}

export function shouldRetryDirectLrclibResponse(
  status: number,
  retryAfterMs: number | null,
  attemptIndex: number,
  maxAttempts = LRCLIB_DIRECT_MAX_ATTEMPTS
): boolean {
  if (attemptIndex >= maxAttempts - 1) return false;
  if (status !== 503 && status !== 429) return false;
  if (retryAfterMs == null) return false;
  return retryAfterMs <= LRCLIB_DIRECT_MAX_RETRY_AFTER_MS;
}
