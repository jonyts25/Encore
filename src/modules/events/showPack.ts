import type { QueryClient } from '@tanstack/react-query';

import { lyricsExpiresAfterShow } from '@/core/db/lyricsCache';
import { getShowPackRecord, setShowPackRecord } from '@/core/db/showPackCache';
import { queryKeys } from '@/core/query';

import { fetchArtistSongs } from '@/modules/catalog/api';
import { fetchLyrics } from '@/modules/lyrics/api';
import { fetchShowPrediction } from '@/modules/setlist/api';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { fetchShowById } from './api';
import type { Show } from './types';
import { activeCutoffIso } from './visibility';

const LYRICS_BATCH_SIZE = 4;
const GOING_PREFETCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const STUCK_DOWNLOADING_MS = 10 * 60 * 1000;
const READY_STALE_MS = 24 * 60 * 60 * 1000;

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

export function isShowWithinGoingPrefetchWindow(showDate: string, now = new Date()): boolean {
  const showTime = new Date(showDate).getTime();
  const lowerBound = new Date(activeCutoffIso(now)).getTime();
  const upperBound = now.getTime() + GOING_PREFETCH_WINDOW_MS;
  return showTime >= lowerBound && showTime <= upperBound;
}

async function shouldPrefetchShowPack(
  showId: string,
  options?: { force?: boolean }
): Promise<boolean> {
  if (options?.force) return true;

  const record = await getShowPackRecord(showId);
  if (!record) return true;

  if (record.status === 'partial') return true;

  if (record.status === 'downloading') {
    return Date.now() - record.statusUpdatedAt >= STUCK_DOWNLOADING_MS;
  }

  if (record.status === 'ready') {
    if (!record.downloadedAt) return true;
    return Date.now() - record.downloadedAt >= READY_STALE_MS;
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

  const now = Date.now();

  await setShowPackRecord({
    showId,
    status: 'downloading',
    lyricsCached: 0,
    lyricsTotal: 0,
    lyricsFailed: 0,
    downloadedAt: null,
    statusUpdatedAt: now,
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.show(showId),
    queryFn: () => fetchShowById(showId),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.prediction(showId),
    queryFn: () => fetchShowPrediction(showId),
  });

  const showQueryFailed = isPrefetchQueryMissingOrFailed(
    queryClient,
    queryKeys.show(showId)
  );
  const predictionQueryFailed = isPrefetchQueryMissingOrFailed(
    queryClient,
    queryKeys.prediction(showId)
  );

  void queryClient.prefetchQuery({
    queryKey: queryKeys.artistSongs(show.artist_id),
    queryFn: () => fetchArtistSongs(show.artist_id),
  });

  if (showQueryFailed || predictionQueryFailed) {
    const failedAt = Date.now();
    await setShowPackRecord({
      showId,
      status: 'partial',
      lyricsCached: 0,
      lyricsTotal: 0,
      lyricsFailed: 1,
      downloadedAt: failedAt,
      statusUpdatedAt: failedAt,
    });
    return;
  }

  const prediction = queryClient.getQueryData<SetlistPrediction | null>(
    queryKeys.prediction(showId)
  );
  const artistName = show.artist.name;
  const targets = prediction ? songTargets(prediction, artistName) : [];
  const expiresAt = lyricsExpiresAfterShow(show.show_date);

  let lyricsCached = 0;
  let lyricsFailed = 0;

  for (let index = 0; index < targets.length; index += LYRICS_BATCH_SIZE) {
    const batch = targets.slice(index, index + LYRICS_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ artist, title }) => {
        try {
          const result = await fetchLyrics(artist, title, { expiresAt });
          if (result) {
            lyricsCached += 1;
          }
        } catch {
          lyricsFailed += 1;
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
    });
  }

  const finishedAt = Date.now();
  await setShowPackRecord({
    showId,
    status: lyricsFailed === 0 ? 'ready' : 'partial',
    lyricsCached,
    lyricsTotal: targets.length,
    lyricsFailed,
    downloadedAt: finishedAt,
    statusUpdatedAt: finishedAt,
  });
}

export async function prefetchGoingShowPacks(
  shows: Show[],
  queryClient: QueryClient
): Promise<void> {
  const eligible = shows.filter((show) => isShowWithinGoingPrefetchWindow(show.show_date));

  for (const show of eligible) {
    const shouldRun = await shouldPrefetchShowPack(show.id);
    if (!shouldRun) continue;
    void prefetchShowPack(show, queryClient);
  }
}
