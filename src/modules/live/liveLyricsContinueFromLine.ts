import {
  DEFAULT_MANUAL_LINE_INTERVAL_SECONDS,
  elapsedSecondsForLineIndex,
  resolveActiveLineIndex,
} from '@/modules/lyrics/scrollLogic';
import type { LyricsScrollMode, SyncedLine } from '@/modules/lyrics/types';

/** Playback elapsed (s) so `lineIndex` is the active line — synced uses LRC timestamp at index. */
export function continueFromLineElapsedSeconds(
  lineIndex: number,
  scrollMode: LyricsScrollMode,
  displayLines: string[],
  syncedLines: SyncedLine[],
  durationSeconds: number | null
): number {
  return elapsedSecondsForLineIndex(
    scrollMode,
    lineIndex,
    displayLines,
    syncedLines,
    durationSeconds,
    DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
  );
}

export function activeLineIndexAfterContinueFrom(
  lineIndex: number,
  scrollMode: LyricsScrollMode,
  displayLines: string[],
  syncedLines: SyncedLine[],
  durationSeconds: number | null
): number {
  const elapsed = continueFromLineElapsedSeconds(
    lineIndex,
    scrollMode,
    displayLines,
    syncedLines,
    durationSeconds
  );
  return resolveActiveLineIndex(
    scrollMode,
    elapsed,
    displayLines,
    syncedLines,
    durationSeconds,
    DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
  );
}
