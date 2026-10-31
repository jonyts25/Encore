import { LyricsBusyError } from './lrclibErrors';

export const LRCLIB_FETCH_TIMEOUT_MS = 8000;
export const LRCLIB_MAX_RETRY_AFTER_MS = 5000;
export const LRCLIB_SONG_BUDGET_MS = 20_000;
export const LRCLIB_RETRY_DELAYS_MS = [0, 2000, 5000] as const;

export type LrclibFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterMs(maxMs: number): number {
  return Math.floor(Math.random() * maxMs);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

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

export async function lrclibRequestDirectWithFetch<T>(
  path: string,
  baseUrl: string,
  fetchFn: LrclibFetchFn,
  options?: {
    now?: () => number;
    fetchTimeoutMs?: number;
    songBudgetMs?: number;
    retryDelaysMs?: readonly number[];
  }
): Promise<T> {
  const nowFn = options?.now ?? Date.now;
  const fetchTimeoutMs = options?.fetchTimeoutMs ?? LRCLIB_FETCH_TIMEOUT_MS;
  const songBudgetMs = options?.songBudgetMs ?? LRCLIB_SONG_BUDGET_MS;
  const retryDelaysMs = options?.retryDelaysMs ?? LRCLIB_RETRY_DELAYS_MS;

  const deadline = nowFn() + songBudgetMs;
  let lastTransient: Error | null = null;

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    const attemptStart = nowFn();
    if (attemptStart >= deadline) break;

    const baseDelay = retryDelaysMs[attempt] ?? 0;
    if (baseDelay > 0) {
      const delay = Math.min(baseDelay + jitterMs(400), deadline - attemptStart - 50);
      if (delay > 0) {
        await sleep(delay);
      }
    }

    const beforeFetch = nowFn();
    if (beforeFetch >= deadline) break;

    const remaining = deadline - beforeFetch;
    const attemptTimeout = Math.min(fetchTimeoutMs, remaining);
    if (attemptTimeout <= 0) break;

    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Encore/0.1 (https://github.com/jonyts25/Encore)',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(attemptTimeout),
      });

      if (response.status === 503 || response.status === 429) {
        lastTransient = new Error(`LRCLIB temporary failure (${response.status})`);
        const retryAfterMs = parseRetryAfterMs(response, nowFn());
        if (retryAfterMs != null && retryAfterMs > LRCLIB_MAX_RETRY_AFTER_MS) {
          throw new LyricsBusyError();
        }
        if (retryAfterMs != null && retryAfterMs > 0) {
          const waitMs = Math.min(retryAfterMs, LRCLIB_MAX_RETRY_AFTER_MS) + jitterMs(400);
          const waitBudget = deadline - nowFn();
          if (waitMs > waitBudget) {
            break;
          }
          await sleep(waitMs);
        }
        continue;
      }

      if (response.status === 404) {
        throw new Error('Lyrics not found');
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LRCLIB request failed (${response.status}): ${text}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof LyricsBusyError) {
        throw error;
      }
      if (isAbortError(error)) {
        lastTransient = error instanceof Error ? error : new Error('LRCLIB fetch timeout');
        continue;
      }
      throw error;
    }
  }

  if (lastTransient) {
    throw new LyricsBusyError();
  }

  throw new LyricsBusyError();
}
