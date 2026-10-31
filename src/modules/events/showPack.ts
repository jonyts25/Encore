import type { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/core/api/client';

import { lyricsExpiresAfterShow } from '@/core/db/lyricsCache';
import { getShowPackRecord, setShowPackRecord } from '@/core/db/showPackCache';
import { queryKeys } from '@/core/query';

import { addUserSong, fetchArtistSongs } from '@/modules/catalog/api';
import { fetchLyrics, isLyricsNetworkFailure } from '@/modules/lyrics/api';
import { fetchShowPrediction } from '@/modules/setlist/api';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { fetchShowById } from './api';
import type { PracticePackSong } from './practicePackTypes';
import {
  collectShowPackSongTitles,
  isShowWithinPackAttentionWindow,
  mergePracticeSong,
  shouldPrefetchShowPackRecord,
} from './showPackLogic';
import type { Show } from './types';
import { activeCutoffIso } from './visibility';

export type PracticeSongPick = {
  title: string;
  songId?: string | null;
  lyricsArtist?: string;
  requireCatalogSong?: boolean;
};

export type AddPracticeSongErrorCode =
  | 'not_authenticated'
  | 'daily_limit'
  | 'invalid_input'
  | 'lyrics_missing'
  | 'lyrics_network'
  | 'unknown';

export type AddPracticeSongResult =
  | { ok: true; songId: string; title: string; lyricsStatus: 'cached' }
  | {
      ok: false;
      code: AddPracticeSongErrorCode;
      createdToday?: number;
      limit?: number;
    };

const LYRICS_BATCH_SIZE = 2;
const LYRICS_BATCH_PAUSE_MS = 500;

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
  prediction: SetlistPrediction | null,
  artistName: string,
  practiceSongs: readonly PracticePackSong[]
): { artist: string; title: string }[] {
  return collectShowPackSongTitles(prediction, practiceSongs).map((title) => ({
    artist: artistName,
    title,
  }));
}

export function isShowEligibleForShowPack(showDate: string, now = new Date()): boolean {
  return new Date(showDate).getTime() >= new Date(activeCutoffIso(now)).getTime();
}

async function shouldPrefetchShowPack(
  showId: string,
  showDate: string,
  options?: { force?: boolean }
): Promise<boolean> {
  const record = await getShowPackRecord(showId);
  return shouldPrefetchShowPackRecord(record, showDate, options);
}

export async function prefetchShowPack(
  show: Show,
  queryClient: QueryClient,
  options?: { force?: boolean }
): Promise<void> {
  const showId = show.id;
  const shouldRun = await shouldPrefetchShowPack(showId, show.show_date, options);
  if (!shouldRun) return;

  const expiresAt = lyricsExpiresAfterShow(show.show_date);
  const now = Date.now();

  const existingPractice = (await getShowPackRecord(showId))?.practiceSongs ?? [];

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
    practiceSongs: existingPractice,
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
      practiceSongs: existingPractice,
    });
    return;
  }

  const artistName = showFromNetwork.artist.name;
  const targets = songTargets(prediction ?? null, artistName, existingPractice);

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
      practiceSongs: existingPractice,
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
    practiceSongs: existingPractice,
  });
}

export async function addPracticeSongToShowPack(
  show: Show,
  pick: PracticeSongPick
): Promise<AddPracticeSongResult> {
  const trimmedTitle = pick.title.trim();
  if (!trimmedTitle) return { ok: false, code: 'invalid_input' };

  let songId = pick.songId?.trim() ?? '';
  let canonicalTitle = trimmedTitle;

  if (pick.requireCatalogSong || !songId) {
    const catalogResult = await addUserSong(show.artist_id, trimmedTitle);
    if (!catalogResult.ok) {
      if (catalogResult.reason === 'daily_limit') {
        return {
          ok: false,
          code: 'daily_limit',
          createdToday: catalogResult.createdToday,
          limit: catalogResult.limit,
        };
      }
      if (catalogResult.reason === 'not_authenticated') {
        return { ok: false, code: 'not_authenticated' };
      }
      if (catalogResult.reason === 'invalid_input') {
        return { ok: false, code: 'invalid_input' };
      }
      return { ok: false, code: 'unknown' };
    }
    songId = catalogResult.song.id;
    canonicalTitle = catalogResult.song.title;
  }

  if (!songId) return { ok: false, code: 'unknown' };

  const lyricsStatus = await cacheLyricsForShowPackTitle(show, canonicalTitle);

  const record = await getShowPackRecord(show.id);
  const beforeTitles = collectShowPackSongTitles(record?.prediction ?? null, record?.practiceSongs ?? []);
  const practiceSongs = mergePracticeSong(record?.practiceSongs ?? [], {
    songId,
    title: canonicalTitle,
  });
  const expiresAt = lyricsExpiresAfterShow(show.show_date);
  const now = Date.now();

  const persistPack = async () => {
    if (record) {
      let lyricsCached = record.lyricsCached;
      if (lyricsStatus === 'cached' && !beforeTitles.includes(canonicalTitle)) {
        lyricsCached += 1;
      }
      await setShowPackRecord({
        ...record,
        practiceSongs,
        lyricsTotal: Math.max(
          record.lyricsTotal,
          collectShowPackSongTitles(record.prediction, practiceSongs).length
        ),
        lyricsCached,
        lyricsFailed: lyricsStatus === 'failed' ? record.lyricsFailed + 1 : record.lyricsFailed,
        statusUpdatedAt: now,
      });
      return;
    }

    await setShowPackRecord({
      showId: show.id,
      status: lyricsStatus === 'failed' ? 'partial' : 'ready',
      lyricsCached: lyricsStatus === 'cached' ? 1 : 0,
      lyricsTotal: 1,
      lyricsFailed: lyricsStatus === 'failed' ? 1 : 0,
      downloadedAt: now,
      statusUpdatedAt: now,
      expiresAt,
      show,
      prediction: null,
      lyricsMissingTitles: lyricsStatus === 'missing' ? [canonicalTitle] : [],
      practiceSongs,
    });
  };

  await persistPack();

  if (lyricsStatus === 'missing') return { ok: false, code: 'lyrics_missing' };
  if (lyricsStatus === 'failed') return { ok: false, code: 'lyrics_network' };

  return { ok: true, songId, title: canonicalTitle, lyricsStatus: 'cached' };
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
  const eligible = shows.filter(
    (show) =>
      isShowEligibleForShowPack(show.show_date) &&
      isShowWithinPackAttentionWindow(show.show_date)
  );

  for (const show of eligible) {
    const shouldRun = await shouldPrefetchShowPack(show.id, show.show_date);
    if (!shouldRun) continue;
    void prefetchShowPack(show, queryClient);
  }
}
