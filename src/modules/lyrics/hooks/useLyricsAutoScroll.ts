import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LyricsScrollMode, SyncedLine } from '../types';
import {
  buildDisplayLines,
  detectScrollMode,
  resolveActiveLineIndex,
} from '../scrollLogic';

const MANUAL_LINE_INTERVAL_SECONDS = 4;
const TICK_MS = 100;

type UseLyricsAutoScrollOptions = {
  plainLyrics: string;
  syncedLines: SyncedLine[];
  durationSeconds: number | null;
};

export function useLyricsAutoScroll({
  plainLyrics,
  syncedLines,
  durationSeconds,
}: UseLyricsAutoScrollOptions) {
  const scrollMode = useMemo(
    () => detectScrollMode(syncedLines, durationSeconds),
    [durationSeconds, syncedLines]
  );
  const displayLines = useMemo(
    () => buildDisplayLines(plainLyrics, syncedLines),
    [plainLyrics, syncedLines]
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
  }, [plainLyrics, syncedLines, durationSeconds, reset]);

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
        syncedLines,
        durationSeconds,
        MANUAL_LINE_INTERVAL_SECONDS
      );
      setActiveLineIndex(nextIndex);

      if (
        scrollMode === 'estimated' &&
        durationSeconds &&
        elapsedSeconds >= durationSeconds
      ) {
        pause();
      }
    };

    tick();
    const intervalId = setInterval(tick, TICK_MS);
    return () => clearInterval(intervalId);
  }, [
    displayLines,
    durationSeconds,
    isPlaying,
    pause,
    scrollMode,
    syncedLines,
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
