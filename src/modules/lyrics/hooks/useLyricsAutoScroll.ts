import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LyricsScrollMode, SyncedLine } from '../types';
import {
  buildDisplayLines,
  DEFAULT_MANUAL_LINE_INTERVAL_SECONDS,
  detectScrollMode,
  elapsedSecondsForLineIndex,
  normalizeDurationSeconds,
  normalizePlainLyrics,
  normalizeSyncedLines,
  resolveActiveLineIndex,
} from '../scrollLogic';
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

  const playPause = useCallback(() => {
    if (scrollMode === 'manual' && !isPlaying && activeLineIndex === 0 && pausedElapsedRef.current === 0) {
      start();
      return;
    }
    toggle();
  }, [activeLineIndex, isPlaying, scrollMode, start, toggle]);

  const getElapsedSeconds = useCallback(() => {
    if (startedAtRef.current === null) {
      return pausedElapsedRef.current;
    }
    return (Date.now() - startedAtRef.current) / 1000;
  }, []);

  const setElapsedSeconds = useCallback(
    (seconds: number) => {
      const clampedSeconds = Math.max(0, seconds);
      pausedElapsedRef.current = clampedSeconds;
      if (isPlaying) {
        startedAtRef.current = Date.now() - clampedSeconds * 1000;
      } else {
        startedAtRef.current = null;
      }

      const nextIndex = resolveActiveLineIndex(
        scrollMode,
        clampedSeconds,
        displayLines,
        safeSyncedLines,
        safeDurationSeconds,
        DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
      );
      setActiveLineIndex(nextIndex);
    },
    [displayLines, isPlaying, safeDurationSeconds, safeSyncedLines, scrollMode]
  );

  const seekToLine = useCallback(
    (lineIndex: number) => {
      if (displayLines.length === 0) return;
      const elapsed = elapsedSecondsForLineIndex(
        scrollMode,
        lineIndex,
        displayLines,
        safeSyncedLines,
        safeDurationSeconds,
        DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
      );
      setElapsedSeconds(elapsed);
    },
    [displayLines, safeDurationSeconds, safeSyncedLines, scrollMode, setElapsedSeconds]
  );

  const stepLine = useCallback(
    (delta: -1 | 1) => {
      if (displayLines.length === 0) return;
      const nextIndex = Math.min(Math.max(activeLineIndex + delta, 0), displayLines.length - 1);
      if (nextIndex === activeLineIndex) return;
      seekToLine(nextIndex);
    },
    [activeLineIndex, displayLines.length, seekToLine]
  );

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
        DEFAULT_MANUAL_LINE_INTERVAL_SECONDS
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
    playPause,
    stepLine,
    seekToLine,
    getElapsedSeconds,
  };
}
