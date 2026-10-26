import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getCachedShowFromPack } from '@/core/db/showPackCache';
import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchShowById } from '../api';
import type { Show } from '../types';

export function useShow(showId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showId) return;
    void (async () => {
      const fromPack = await getCachedShowFromPack(showId);
      if (fromPack) {
        queryClient.setQueryData(queryKeys.show(showId), fromPack);
        return;
      }
      const cached = await readOfflineQuery<Show | null>(`show:${showId}`);
      if (cached) {
        queryClient.setQueryData(queryKeys.show(showId), cached);
      }
    })();
  }, [queryClient, showId]);

  const query = useQuery<Show | null>({
    queryKey: queryKeys.show(showId),
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

  const isLoading = query.isPending && query.data === undefined;
  const show = query.data ?? null;

  let error: string | null = null;
  if (query.isError && !show) {
    error = query.error instanceof Error ? query.error.message : t('events.loadError');
  } else if (!isLoading && show === null && query.isSuccess) {
    error = t('events.showNotFound');
  }

  return { show, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
