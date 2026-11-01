export const LYRICS_SERVER_BUSY_STREAK_TO_OPEN = 2;
export const LYRICS_SERVER_CIRCUIT_OPEN_MS = 5 * 60 * 1000;
export const LYRICS_PACK_BATCH_SIZE_WHEN_CIRCUIT_OPEN = 3;

let consecutiveServerBusy = 0;
let circuitOpenUntilMs = 0;

export function resetLyricsServerCircuitState(): void {
  consecutiveServerBusy = 0;
  circuitOpenUntilMs = 0;
}

function expireCircuitIfNeeded(now: number): void {
  if (circuitOpenUntilMs > 0 && circuitOpenUntilMs <= now) {
    circuitOpenUntilMs = 0;
    consecutiveServerBusy = 0;
  }
}

export function isLyricsServerCircuitOpen(now = Date.now()): boolean {
  expireCircuitIfNeeded(now);
  return circuitOpenUntilMs > now;
}

export function shouldBypassLyricsServer(now = Date.now()): boolean {
  return isLyricsServerCircuitOpen(now);
}

export function getShowPackLyricsBatchSize(defaultBatchSize: number, now = Date.now()): number {
  return isLyricsServerCircuitOpen(now) ? LYRICS_PACK_BATCH_SIZE_WHEN_CIRCUIT_OPEN : defaultBatchSize;
}

export function recordLyricsServerSuccess(): void {
  consecutiveServerBusy = 0;
}

export function recordLyricsServerNonBusyFailure(): void {
  consecutiveServerBusy = 0;
}

export function recordLyricsServerBusy(now = Date.now()): void {
  consecutiveServerBusy += 1;
  if (consecutiveServerBusy >= LYRICS_SERVER_BUSY_STREAK_TO_OPEN) {
    circuitOpenUntilMs = now + LYRICS_SERVER_CIRCUIT_OPEN_MS;
  }
}

/** Test-only snapshot. */
export function getLyricsServerCircuitStateForTests(): {
  consecutiveServerBusy: number;
  circuitOpenUntilMs: number;
} {
  return { consecutiveServerBusy, circuitOpenUntilMs };
}
