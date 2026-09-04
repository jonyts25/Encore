import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LyricsScrollMode, SyncedLine } from '../types';
import {
  buildDisplayLines,
  detectScrollMode,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
  resolveActiveLineIndex,
} from '../scrollLogic';

const MANUAL_LINE_INTERVAL_SECONDS = 4;
const TICK_MS = 100;

type UseLyricsAutoScrollOptions = {
  plainLyrics?: string | null;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
  autoStart?: boolean;
};

export function useLyricsAutoScroll({
  plainLyrics,
  syncedLines,
  durationSeconds,
  autoStart = false,
}: UseLyricsAutoScrollOptions) {
  const safePlainLyrics = normalizePlainLyrics(plainLyrics);
  const safeSyncedLines = normalizeSyncedLines(syncedLines);
  const safeDurationSeconds = normalizeDurationSeconds(durationSeconds);

  const scrollMode = useMemo(
    () => detectScrollMode(safeSyncedLines, safeDurationSeconds),
    [safeDurationSeconds, safeSyncedLines]
  );
  const displayLines = useMemo(
    () => buildDisplayLines(safePlainLyrics, safeSyncedLines),
    [safePlainLyrics, safeSyncedLines]
  );

  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef(0);

  const reset = useCallback(() => {
    setIsPlaying(false);
    startedAtRef.current = null;
    pausedElapsedRef.current = 0;
    setActiveLineIndex(0);
  }, []);

  const start = useCallback(() => {
    startedAtRef.current = Date.now() - pausedElapsedRef.current * 1000;
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (startedAtRef.current !== null) {
      pausedElapsedRef.current = (Date.now() - startedAtRef.current) / 1000;
    }
    startedAtRef.current = null;
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      start();
    }
  }, [isPlaying, pause, start]);

  useEffect(() => {
    reset();
  }, [safePlainLyrics, safeSyncedLines, safeDurationSeconds, reset]);

  useEffect(() => {
    if (!autoStart || displayLines.length === 0) return;
    start();
  }, [autoStart, displayLines.length, safePlainLyrics, safeSyncedLines, safeDurationSeconds, start]);

  useEffect(() => {
    if (!isPlaying || displayLines.length === 0) return undefined;

    const tick = () => {
      const elapsedSeconds =
        startedAtRef.current === null
          ? pausedElapsedRef.current
          : (Date.now() - startedAtRef.current) / 1000;

      const nextIndex = resolveActiveLineIndex(
        scrollMode,
        elapsedSeconds,
        displayLines,
        safeSyncedLines,
        safeDurationSeconds,
        MANUAL_LINE_INTERVAL_SECONDS
      );
      setActiveLineIndex(nextIndex);

      if (
        scrollMode === 'estimated' &&
        safeDurationSeconds !== null &&
        elapsedSeconds >= safeDurationSeconds
      ) {
        pause();
      }
    };

    tick();
    const intervalId = setInterval(tick, TICK_MS);
    return () => clearInterval(intervalId);
  }, [
    displayLines,
    isPlaying,
    pause,
    safeDurationSeconds,
    safeSyncedLines,
    scrollMode,
  ]);

  const modeLabelKey = useMemo((): `lyrics.mode.${LyricsScrollMode}` => {
    return `lyrics.mode.${scrollMode}`;
  }, [scrollMode]);

  return {
    scrollMode,
    displayLines,
    activeLineIndex,
    isPlaying,
    modeLabelKey,
    start,
    pause,
    reset,
    toggle,
  };
}
