import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { seedQueryClientFromCache } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchDiscographyPayload } from '../discographyApi';
import type { DiscographyPayload } from '../types';

type UseDiscographyOptions = {
  userId?: string | null;
  enabled?: boolean;
};

export function useDiscography(options: UseDiscographyOptions = {}) {
  const { userId = null, enabled = true } = options;
  const queryClient = useQueryClient();
  const cacheKey = userId ? `discography:${userId}` : null;
  const queryKey = userId ? queryKeys.discography(userId) : (['discography', 'disabled'] as const);

  useEffect(() => {
    if (!cacheKey || !userId) return;
    void seedQueryClientFromCache(queryClient, queryKey, () =>
      readOfflineQuery<DiscographyPayload>(cacheKey)
    );
  }, [cacheKey, queryClient, queryKey, userId]);

  const query = useQuery<DiscographyPayload>({
    queryKey,
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchDiscographyPayload(userId!),
      readCache: () => (cacheKey ? readOfflineQuery<DiscographyPayload>(cacheKey) : Promise.resolve(null)),
      writeCache: (payload) =>
        cacheKey ? writeOfflineQuery(cacheKey, payload) : Promise.resolve(),
    }),
    enabled: enabled && Boolean(userId),
    placeholderData: (previous) => previous,
    refetchOnMount: 'always',
  });

  return {
    payload: query.data,
    entries: query.data?.entries ?? [],
    favoriteArtists: query.data?.favoriteArtists ?? [],
    isLoading: query.isPending && query.data === undefined,
    error:
      query.isError && query.data === undefined
        ? query.error instanceof Error
          ? query.error.message
          : 'Failed to load discography'
        : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
