import type { LyricsScrollMode, SyncedLine } from './types';

export function splitPlainLyricsLines(plainLyrics: string): string[] {
  return plainLyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function detectScrollMode(
  syncedLines: SyncedLine[],
  durationSeconds: number | null
): LyricsScrollMode {
  if (syncedLines.length > 0) return 'synced';
  if (durationSeconds && durationSeconds > 0) return 'estimated';
  return 'manual';
}

export function buildDisplayLines(
  plainLyrics: string,
  syncedLines: SyncedLine[]
): string[] {
  if (syncedLines.length > 0) {
    return syncedLines.map((entry) => entry.line);
  }
  return splitPlainLyricsLines(plainLyrics);
}

export function resolveActiveLineIndex(
  mode: LyricsScrollMode,
  elapsedSeconds: number,
  displayLines: string[],
  syncedLines: SyncedLine[],
  durationSeconds: number | null,
  manualLineIntervalSeconds: number
): number {
  if (displayLines.length === 0) return 0;

  if (mode === 'synced') {
    let index = 0;
    for (let i = 0; i < syncedLines.length; i += 1) {
      if (syncedLines[i].timestamp_seconds <= elapsedSeconds) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  if (mode === 'estimated' && durationSeconds && durationSeconds > 0) {
    const lineDuration = durationSeconds / displayLines.length;
    const index = Math.floor(elapsedSeconds / lineDuration);
    return Math.min(Math.max(index, 0), displayLines.length - 1);
  }

  const index = Math.floor(elapsedSeconds / manualLineIntervalSeconds);
  return Math.min(Math.max(index, 0), displayLines.length - 1);
}
