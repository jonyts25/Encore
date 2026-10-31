import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getCachedLyrics } from '@/core/db/lyricsCache';
import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { queryClientHasData } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchLyrics } from '../api';
import { LyricsBusyError } from '../errors';
import type { LyricsResult } from '../types';

export function useLyrics(artist: string, title: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const trimmedArtist = artist.trim();
  const trimmedTitle = title.trim();
  const enabled = Boolean(trimmedArtist && trimmedTitle);
  const cacheKey = `lyrics:${trimmedArtist.toLowerCase()}::${trimmedTitle.toLowerCase()}`;

  const queryKey = queryKeys.lyrics(trimmedArtist, trimmedTitle);

  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      if (queryClientHasData(queryClient, queryKey)) return;

      const fromLyricsDb = await getCachedLyrics(trimmedArtist, trimmedTitle);
      if (queryClientHasData(queryClient, queryKey)) return;
      if (fromLyricsDb) {
        queryClient.setQueryData(queryKey, fromLyricsDb);
        return;
      }

      const cached = await readOfflineQuery<LyricsResult | null>(cacheKey);
      if (queryClientHasData(queryClient, queryKey)) return;
      if (cached) {
        queryClient.setQueryData(queryKey, cached);
      }
    })();
  }, [cacheKey, enabled, queryClient, queryKey, trimmedArtist, trimmedTitle]);

  const query = useQuery<LyricsResult | null>({
    queryKey,
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchLyrics(trimmedArtist, trimmedTitle),
      readCache: async () => {
        const fromLyricsDb = await getCachedLyrics(trimmedArtist, trimmedTitle);
        if (fromLyricsDb) return fromLyricsDb;
        return readOfflineQuery<LyricsResult | null>(cacheKey);
      },
      writeCache: (lyrics) => {
        if (lyrics) {
          return writeOfflineQuery(cacheKey, lyrics);
        }
        return Promise.resolve();
      },
    }),
    enabled,
    placeholderData: (previous) => previous,
  });

  const lyrics: LyricsResult | null = query.data ?? null;
  const isLoading = enabled && query.isPending && query.data === undefined;
  const notFound = enabled && query.isSuccess && !lyrics;
  const isBusy = query.isError && query.error instanceof LyricsBusyError;
  const error =
    query.isError && !lyrics
      ? isBusy
        ? t('lyrics.busy')
        : query.error instanceof Error
          ? query.error.message
          : t('lyrics.loadError')
      : null;

  return {
    lyrics,
    isLoading,
    error,
    isBusy,
    notFound,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
