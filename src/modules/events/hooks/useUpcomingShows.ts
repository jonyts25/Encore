import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { seedQueryClientFromCache } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchUpcomingShows } from '../api';
import type { Show } from '../types';

type UseUpcomingShowsOptions = {
  followedOnly?: boolean;
  userId?: string | null;
  accessToken?: string | null;
  enabled?: boolean;
};

export function useUpcomingShows(options: UseUpcomingShowsOptions = {}) {
  const { followedOnly = false, userId = null, accessToken = null, enabled = true } = options;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const cacheKey = `upcoming:${followedOnly ? 'followed' : 'all'}:${userId ?? 'guest'}`;

  useEffect(() => {
    void seedQueryClientFromCache(queryClient, queryKeys.upcoming(followedOnly, userId), () =>
      readOfflineQuery<Show[]>(cacheKey)
    );
  }, [cacheKey, followedOnly, queryClient, userId]);

  const query = useQuery<Show[]>({
    queryKey: queryKeys.upcoming(followedOnly, userId),
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () =>
        fetchUpcomingShows({
          followed: followedOnly,
          accessToken: followedOnly ? accessToken ?? undefined : undefined,
        }),
      readCache: () => readOfflineQuery<Show[]>(cacheKey),
      writeCache: (shows) => writeOfflineQuery(cacheKey, shows),
    }),
    enabled,
    placeholderData: (previous) => previous,
  });

  const shows: Show[] = query.data ?? [];
  const isLoading = query.isPending && !query.data;
  const error =
    query.isError && shows.length === 0
      ? query.error instanceof Error
        ? query.error.message
        : t('events.loadError')
      : null;

  return { shows, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
