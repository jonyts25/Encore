import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getCachedPredictionFromPack } from '@/core/db/showPackCache';
import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchShowPrediction } from '../api';
import type { SetlistPrediction } from '../types';

type UseShowPredictionOptions = {
  enabled?: boolean;
};

export function useShowPrediction(showId: string, options: UseShowPredictionOptions = {}) {
  const { enabled = true } = options;
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!showId) return;
    void (async () => {
      const fromPack = await getCachedPredictionFromPack(showId);
      if (fromPack) {
        queryClient.setQueryData(queryKeys.prediction(showId), fromPack);
        return;
      }
      const cached = await readOfflineQuery<SetlistPrediction | null>(`prediction:${showId}`);
      if (cached) {
        queryClient.setQueryData(queryKeys.prediction(showId), cached);
      }
    })();
  }, [queryClient, showId]);

  const query = useQuery<SetlistPrediction | null>({
    queryKey: queryKeys.prediction(showId),
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchShowPrediction(showId),
      readCache: async () => {
        const fromPack = await getCachedPredictionFromPack(showId);
        if (fromPack) return fromPack;
        return readOfflineQuery<SetlistPrediction | null>(`prediction:${showId}`);
      },
      writeCache: (prediction) => writeOfflineQuery(`prediction:${showId}`, prediction),
    }),
    enabled: enabled && Boolean(showId),
    placeholderData: (previous) => previous,
  });

  const prediction: SetlistPrediction | null = query.data ?? null;
  const isLoading = query.isPending && query.data === undefined;
  const error =
    query.isError && !prediction
      ? query.error instanceof Error
        ? query.error.message
        : t('setlist.loadError')
      : null;

  return { prediction, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
