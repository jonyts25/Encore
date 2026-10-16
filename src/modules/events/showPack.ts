import type { QueryClient } from '@tanstack/react-query';

import { lyricsExpiresAfterShow } from '@/core/db/lyricsCache';
import { getShowPackRecord, setShowPackRecord } from '@/core/db/showPackCache';
import { queryKeys } from '@/core/query';

import { fetchLyrics } from '@/modules/lyrics/api';
import { fetchShowPrediction } from '@/modules/setlist/api';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { fetchShowById } from './api';
import type { Show } from './types';

const LYRICS_BATCH_SIZE = 4;
const GOING_PREFETCH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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

export function isShowWithinGoingPrefetchWindow(showDate: string, now = Date.now()): boolean {
  const showTime = new Date(showDate).getTime();
  return showTime >= now && showTime <= now + GOING_PREFETCH_WINDOW_MS;
}

export async function prefetchShowPack(
  show: Show,
  queryClient: QueryClient,
  options?: { force?: boolean }
): Promise<void> {
  const showId = show.id;
  const existing = await getShowPackRecord(showId);
  if (!options?.force) {
    if (existing?.status === 'ready' || existing?.status === 'downloading') {
      return;
    }
  }

  await setShowPackRecord({
    showId,
    status: 'downloading',
    lyricsCached: 0,
    lyricsTotal: 0,
    downloadedAt: null,
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.show(showId),
    queryFn: () => fetchShowById(showId),
  });

  await queryClient.prefetchQuery({
    queryKey: queryKeys.prediction(showId),
    queryFn: () => fetchShowPrediction(showId),
  });

  const prediction = queryClient.getQueryData<SetlistPrediction | null>(
    queryKeys.prediction(showId)
  );
  const artistName = show.artist.name;
  const targets = prediction ? songTargets(prediction, artistName) : [];
  const expiresAt = lyricsExpiresAfterShow(show.show_date);

  let lyricsCached = 0;

  for (let index = 0; index < targets.length; index += LYRICS_BATCH_SIZE) {
    const batch = targets.slice(index, index + LYRICS_BATCH_SIZE);
    await Promise.all(
      batch.map(async ({ artist, title }) => {
        try {
          const result = await fetchLyrics(artist, title, { expiresAt });
          if (result) lyricsCached += 1;
        } catch {
          // Missing lyrics are skipped for the pack.
        }
      })
    );

    await setShowPackRecord({
      showId,
      status: 'downloading',
      lyricsCached,
      lyricsTotal: targets.length,
      downloadedAt: null,
    });
  }

  await setShowPackRecord({
    showId,
    status: 'ready',
    lyricsCached,
    lyricsTotal: targets.length,
    downloadedAt: Date.now(),
  });
}

export async function prefetchGoingShowPacks(
  shows: Show[],
  queryClient: QueryClient
): Promise<void> {
  const eligible = shows.filter((show) => isShowWithinGoingPrefetchWindow(show.show_date));
  for (const show of eligible) {
    void prefetchShowPack(show, queryClient);
  }
}
