import { onlineManager, type QueryClient } from '@tanstack/react-query';

import {
  getShowPackRecord,
  listShowPackRecordsWithBusyLyrics,
  setShowPackRecord,
} from '@/core/db/showPackCache';

import { ApiError } from '@/core/api/client';
import { fetchLyrics, isLyricsBusyError, isLyricsNetworkFailure } from '@/modules/lyrics/api';
import { lyricsExpiresAfterShow } from '@/core/db/lyricsCache';

import { LYRICS_BUSY_RETRY_DELAYS_MS, removeLyricsBusyTitle } from './showPackLogic';
import { withShowPackPrefetchLock } from './showPackLock';

type BusyRetrySchedule = {
  attemptIndex: number;
  nextAttemptAt: number;
};

const retryScheduleByKey = new Map<string, BusyRetrySchedule>();
let retryLoopStarted = false;
let retryLoopTimer: ReturnType<typeof setInterval> | null = null;

function scheduleKey(showId: string, title: string): string {
  return `${showId}|${title.trim().toLowerCase()}`;
}

export function scheduleBusyLyricsRetry(showId: string, title: string, now = Date.now()): void {
  const key = scheduleKey(showId, title);
  if (!retryScheduleByKey.has(key)) {
    retryScheduleByKey.set(key, {
      attemptIndex: 0,
      nextAttemptAt: now + LYRICS_BUSY_RETRY_DELAYS_MS[0],
    });
  }
}

function bumpRetrySchedule(showId: string, title: string, now = Date.now()): void {
  const key = scheduleKey(showId, title);
  const current = retryScheduleByKey.get(key) ?? { attemptIndex: 0, nextAttemptAt: now };
  const nextIndex = Math.min(current.attemptIndex + 1, LYRICS_BUSY_RETRY_DELAYS_MS.length - 1);
  retryScheduleByKey.set(key, {
    attemptIndex: nextIndex,
    nextAttemptAt: now + LYRICS_BUSY_RETRY_DELAYS_MS[nextIndex],
  });
}

export function __resetBusyLyricsRetryStateForTests(): void {
  retryScheduleByKey.clear();
  if (retryLoopTimer) {
    clearInterval(retryLoopTimer);
    retryLoopTimer = null;
  }
  retryLoopStarted = false;
}

async function retryOneBusyTitle(showId: string, title: string): Promise<void> {
  await withShowPackPrefetchLock(showId, async () => {
    const record = await getShowPackRecord(showId);
    if (!record?.show || !record.lyricsBusyTitles.includes(title)) return;

    const artist = record.show.artist.name;
    const expiresAt = lyricsExpiresAfterShow(record.show.show_date);

    try {
      const result = await fetchLyrics(artist, title, { expiresAt });
      const nextBusy = removeLyricsBusyTitle(record.lyricsBusyTitles, title);
      retryScheduleByKey.delete(scheduleKey(showId, title));

      if (result) {
        await setShowPackRecord({
          ...record,
          lyricsBusyTitles: nextBusy,
          lyricsCached: Math.min(record.lyricsTotal, record.lyricsCached + 1),
          status:
            nextBusy.length === 0 && record.lyricsFailed === 0 && record.status === 'partial'
              ? 'ready'
              : record.status,
          statusUpdatedAt: Date.now(),
        });
        return;
      }

      await setShowPackRecord({
        ...record,
        lyricsBusyTitles: nextBusy,
        lyricsMissingTitles: record.lyricsMissingTitles.includes(title)
          ? record.lyricsMissingTitles
          : [...record.lyricsMissingTitles, title],
        statusUpdatedAt: Date.now(),
      });
    } catch (error) {
      if (isLyricsBusyError(error)) {
        bumpRetrySchedule(showId, title);
        return;
      }
      if (isLyricsNetworkFailure(error)) {
        await setShowPackRecord({
          ...record,
          lyricsFailed: record.lyricsFailed + 1,
          lyricsBusyTitles: removeLyricsBusyTitle(record.lyricsBusyTitles, title),
          statusUpdatedAt: Date.now(),
        });
        return;
      }
      if (error instanceof ApiError && error.status === 404) {
        await setShowPackRecord({
          ...record,
          lyricsBusyTitles: removeLyricsBusyTitle(record.lyricsBusyTitles, title),
          lyricsMissingTitles: record.lyricsMissingTitles.includes(title)
            ? record.lyricsMissingTitles
            : [...record.lyricsMissingTitles, title],
          statusUpdatedAt: Date.now(),
        });
      }
    }

  });
}

export async function tickShowPackBusyLyricsRetry(_queryClient: QueryClient): Promise<void> {
  if (!onlineManager.isOnline()) return;

  const records = await listShowPackRecordsWithBusyLyrics();
  const now = Date.now();

  for (const record of records) {
    for (const title of record.lyricsBusyTitles) {
      scheduleBusyLyricsRetry(record.showId, title, now);
      const schedule = retryScheduleByKey.get(scheduleKey(record.showId, title));
      if (!schedule || schedule.nextAttemptAt > now) continue;
      await retryOneBusyTitle(record.showId, title);
      return;
    }
  }
}

export function startShowPackBusyLyricsRetryLoop(queryClient: QueryClient): () => void {
  if (retryLoopStarted) {
    return () => undefined;
  }
  retryLoopStarted = true;

  const run = () => {
    void tickShowPackBusyLyricsRetry(queryClient);
  };

  run();
  retryLoopTimer = setInterval(run, 5_000);

  const unsubscribe = onlineManager.subscribe((online) => {
    if (online) run();
  });

  return () => {
    unsubscribe();
    if (retryLoopTimer) clearInterval(retryLoopTimer);
    retryLoopStarted = false;
  };
}
