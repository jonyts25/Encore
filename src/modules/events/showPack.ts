import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/client';

import { lyricsExpiresAfterShow } from '@/core/db/lyricsCache';
import { getShowPackRecord, setShowPackRecord } from '@/core/db/showPackCache';
import { queryKeys } from '@/core/query';

import { fetchArtistSongs } from '@/modules/catalog/api';
import { fetchLyrics, isLyricsNetworkFailure } from '@/modules/lyrics/api';
import { fetchShowPrediction } from '@/modules/setlist/api';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { fetchShowById } from './api';
import { isShowPackExpired } from './showPackLogic';
import type { Show } from './types';
import { activeCutoffIso } from './visibility';

const LYRICS_BATCH_SIZE = 2;
const LYRICS_BATCH_PAUSE_MS = 500;
const STUCK_DOWNLOADING_MS = 10 * 60 * 1000;

function isPrefetchQueryMissingOrFailed(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): boolean {
  const state = queryClient.getQueryState(queryKey);
  if (!state) return true;
  if (state.status === 'error') return true;
  if (state.data === undefined || state.data === null) return true;
  return false;
}

function songTargets(
  prediction: SetlistPrediction,
  artistName: string
): { artist: string; title: string }[] {
  const titles = new Set<string>();
  for (const song of prediction.songs) {
    titles.add(song.title);
  }
  for (const other of prediction.others ?? []) {
    titles.add(other.title);
  }
  return [...titles].map((title) => ({ artist: artistName, title }));
}

export function isShowEligibleForShowPack(showDate: string, now = new Date()): boolean {
  return new Date(showDate).getTime() >= new Date(activeCutoffIso(now)).getTime();
}

async function shouldPrefetchShowPack(
  showId: string,
  options?: { force?: boolean }
): Promise<boolean> {
  if (options?.force) return true;

  const record = await getShowPackRecord(showId);
  if (!record) return true;

  if (isShowPackExpired(record)) return true;

  if (record.status === 'partial') return true;

  if (record.status === 'downloading') {
    return Date.now() - record.statusUpdatedAt >= STUCK_DOWNLOADING_MS;
  }

  if (record.status === 'ready') {
    if (record.lyricsMissingTitles.length > 0 || record.lyricsFailed > 0) return true;
    return false;
  }

  return true;
}

export async function prefetchShowPack(
  show: Show,
  queryClient: QueryClient,
  options?: { force?: boolean }
): Promise<void> {
  const showId = show.id;
  const shouldRun = await shouldPrefetchShowPack(showId, options);
  if (!shouldRun) return;

  const expiresAt = lyricsExpiresAfterShow(show.show_date);
  const now = Date.now();

  await setShowPackRecord({
    showId,
    status: 'downloading',
    lyricsCached: 0,
    lyricsTotal: 0,
    lyricsFailed: 0,
    downloadedAt: null,
    statusUpdatedAt: now,
    expiresAt,
    show,
    prediction: null,
    lyricsMissingTitles: [],
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.show(showId),
    queryFn: () => fetchShowById(showId),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.prediction(showId),
    queryFn: () => fetchShowPrediction(showId),
  });

  const showFromNetwork =
    queryClient.getQueryData<Show | null>(queryKeys.show(showId)) ?? show;
  const prediction = queryClient.getQueryData<SetlistPrediction | null>(
    queryKeys.prediction(showId)
  );

  const showQueryFailed = isPrefetchQueryMissingOrFailed(queryClient, queryKeys.show(showId));
  const predictionQueryFailed = isPrefetchQueryMissingOrFailed(
    queryClient,
    queryKeys.prediction(showId)
  );

  void queryClient.prefetchQuery({
    queryKey: queryKeys.artistSongs(show.artist_id),
    queryFn: () => fetchArtistSongs(show.artist_id),
  });

  if (showQueryFailed || predictionQueryFailed || !showFromNetwork) {
    const failedAt = Date.now();
    await setShowPackRecord({
      showId,
      status: 'partial',
      lyricsCached: 0,
      lyricsTotal: 0,
      lyricsFailed: 1,
      downloadedAt: failedAt,
      statusUpdatedAt: failedAt,
      expiresAt,
      show: showFromNetwork ?? show,
      prediction: prediction ?? null,
      lyricsMissingTitles: [],
    });
    return;
  }

  const artistName = showFromNetwork.artist.name;
  const targets = prediction ? songTargets(prediction, artistName) : [];

  let lyricsCached = 0;
  let lyricsFailed = 0;
  const lyricsMissingTitles: string[] = [];

  for (let index = 0; index < targets.length; index += LYRICS_BATCH_SIZE) {
    const batch = targets.slice(index, index + LYRICS_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ artist, title }) => {
        try {
          const result = await fetchLyrics(artist, title, { expiresAt });
          if (result) {
            lyricsCached += 1;
          } else {
            lyricsMissingTitles.push(title);
          }
        } catch (error) {
          if (isLyricsNetworkFailure(error)) {
            lyricsFailed += 1;
          } else if (error instanceof ApiError && error.status === 404) {
            lyricsMissingTitles.push(title);
          } else {
            lyricsFailed += 1;
          }
        }
      })
    );

    await setShowPackRecord({
      showId,
      status: 'downloading',
      lyricsCached,
      lyricsTotal: targets.length,
      lyricsFailed,
      downloadedAt: null,
      statusUpdatedAt: Date.now(),
      expiresAt,
      show: showFromNetwork,
      prediction: prediction ?? null,
      lyricsMissingTitles,
    });

    if (index + LYRICS_BATCH_SIZE < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, LYRICS_BATCH_PAUSE_MS));
    }
  }

  const finishedAt = Date.now();
  const hasNetworkFailures = lyricsFailed > 0;
  await setShowPackRecord({
    showId,
    status: hasNetworkFailures ? 'partial' : 'ready',
    lyricsCached,
    lyricsTotal: targets.length,
    lyricsFailed,
    downloadedAt: finishedAt,
    statusUpdatedAt: finishedAt,
    expiresAt,
    show: showFromNetwork,
    prediction: prediction ?? null,
    lyricsMissingTitles,
  });
}

export async function cacheLyricsForShowPackTitle(
  show: Show,
  title: string
): Promise<'cached' | 'missing' | 'failed'> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return 'missing';

  const expiresAt = lyricsExpiresAfterShow(show.show_date);
  const artistName = show.artist.name;

  try {
    const result = await fetchLyrics(artistName, trimmedTitle, { expiresAt });
    if (result) return 'cached';

    const record = await getShowPackRecord(show.id);
    if (record) {
      const missing = record.lyricsMissingTitles.includes(trimmedTitle)
        ? record.lyricsMissingTitles
        : [...record.lyricsMissingTitles, trimmedTitle];
      await setShowPackRecord({
        ...record,
        lyricsMissingTitles: missing,
        statusUpdatedAt: Date.now(),
      });
    }
    return 'missing';
  } catch (error) {
    if (isLyricsNetworkFailure(error)) return 'failed';
    if (error instanceof ApiError && error.status === 404) return 'missing';
    return 'failed';
  }
}

export async function prefetchGoingShowPacks(
  shows: Show[],
  queryClient: QueryClient
): Promise<void> {
  const eligible = shows.filter((show) => isShowEligibleForShowPack(show.show_date));

  for (const show of eligible) {
    const shouldRun = await shouldPrefetchShowPack(show.id);
    if (!shouldRun) continue;
    void prefetchShowPack(show, queryClient);
  }
}
