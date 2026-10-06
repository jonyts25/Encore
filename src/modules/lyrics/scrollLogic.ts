import type { LyricsScrollMode, SyncedLine } from './types';

export function normalizeSyncedLines(syncedLines?: SyncedLine[] | null): SyncedLine[] {
  return Array.isArray(syncedLines) ? syncedLines : [];
}

export function normalizePlainLyrics(plainLyrics?: string | null): string {
  return typeof plainLyrics === 'string' ? plainLyrics : '';
}

export function normalizeDurationSeconds(durationSeconds?: number | null): number | null {
  return typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : null;
}

export function splitPlainLyricsLines(plainLyrics: string): string[] {
  return normalizePlainLyrics(plainLyrics)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function detectScrollMode(
  syncedLines?: SyncedLine[] | null,
  durationSeconds?: number | null
): LyricsScrollMode {
  const lines = normalizeSyncedLines(syncedLines);
  const duration = normalizeDurationSeconds(durationSeconds);

  if (lines.length > 0) return 'synced';
  if (duration !== null) return 'estimated';
  return 'manual';
}

export function buildDisplayLines(
  plainLyrics?: string | null,
  syncedLines?: SyncedLine[] | null
): string[] {
  const lines = normalizeSyncedLines(syncedLines);
  if (lines.length > 0) {
    return lines.map((entry) => entry.line);
  }
  return splitPlainLyricsLines(normalizePlainLyrics(plainLyrics));
}

export const DEFAULT_MANUAL_LINE_INTERVAL_SECONDS = 4;

export function elapsedSecondsForLineIndex(
  mode: LyricsScrollMode,
  lineIndex: number,
  displayLines: string[],
  syncedLines?: SyncedLine[] | null,
  durationSeconds?: number | null,
  manualLineIntervalSeconds = DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
): number {
  const safeDisplayLines = Array.isArray(displayLines) ? displayLines : [];
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDuration = normalizeDurationSeconds(durationSeconds);

  if (safeDisplayLines.length === 0) return 0;

  const clampedIndex = Math.min(Math.max(lineIndex, 0), safeDisplayLines.length - 1);

  if (mode === 'synced') {
    return safeSyncedLines[clampedIndex]?.timestamp_seconds ?? 0;
  }

  if (mode === 'estimated' && safeDuration !== null) {
    const lineDuration = safeDuration / safeDisplayLines.length;
    return clampedIndex * lineDuration;
  }

  return clampedIndex * manualLineIntervalSeconds;
}

export function resolveActiveLineIndex(
  mode: LyricsScrollMode,
  elapsedSeconds: number,
  displayLines: string[],
  syncedLines?: SyncedLine[] | null,
  durationSeconds?: number | null,
  manualLineIntervalSeconds = DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
): number {
  const safeDisplayLines = Array.isArray(displayLines) ? displayLines : [];
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDuration = normalizeDurationSeconds(durationSeconds);

  if (safeDisplayLines.length === 0) return 0;

  if (mode === 'synced') {
    let index = 0;
    for (let i = 0; i < safeSyncedLines.length; i += 1) {
      if (safeSyncedLines[i].timestamp_seconds <= elapsedSeconds) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  if (mode === 'estimated' && safeDuration !== null) {
    const lineDuration = safeDuration / safeDisplayLines.length;
    const index = Math.floor(elapsedSeconds / lineDuration);
    return Math.min(Math.max(index, 0), safeDisplayLines.length - 1);
  }

  const index = Math.floor(elapsedSeconds / manualLineIntervalSeconds);
  return Math.min(Math.max(index, 0), safeDisplayLines.length - 1);
}
