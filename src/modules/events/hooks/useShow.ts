import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getCachedShowFromPack } from '@/core/db/showPackCache';
import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { queryClientHasData } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { isQueryInitialLoad } from '@/core/query/queryLoadState';

import { fetchShowById } from '../api';
import type { Show } from '../types';

export function useShow(showId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = queryKeys.show(showId);

  useEffect(() => {
    if (!showId) return;
    void (async () => {
      if (queryClientHasData(queryClient, queryKey)) return;

      const fromPack = await getCachedShowFromPack(showId);
      if (queryClientHasData(queryClient, queryKey)) return;
      if (fromPack) {
        queryClient.setQueryData(queryKey, fromPack);
        return;
      }

      const cached = await readOfflineQuery<Show | null>(`show:${showId}`);
      if (queryClientHasData(queryClient, queryKey)) return;
      if (cached) {
        queryClient.setQueryData(queryKey, cached);
      }
    })();
  }, [queryClient, queryKey, showId]);

  const query = useQuery<Show | null>({
    queryKey,
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchShowById(showId),
      readCache: async () => {
        const fromPack = await getCachedShowFromPack(showId);
        if (fromPack) return fromPack;
        return readOfflineQuery<Show | null>(`show:${showId}`);
      },
      writeCache: (show) => writeOfflineQuery(`show:${showId}`, show),
    }),
    enabled: Boolean(showId),
    placeholderData: (previous) => previous,
  });

  const show = query.data ?? null;
  const isLoading = isQueryInitialLoad(query.isPending, query.data);
  const error =
    query.isError && !show
      ? query.error instanceof Error
        ? query.error.message
        : t('events.loadError')
      : null;

  return { show, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
