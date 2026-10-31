import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { seedQueryClientFromCache } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchAttendedShowsForMap } from '../api';
import { buildMyMapData, filterAttendedShowsByYear, type MyMapData } from '../myMapLogic';
import type { Show } from '../types';

type UseMyConcertMapOptions = {
  userId?: string | null;
  enabled?: boolean;
  year?: number | 'all';
};

const EMPTY: Show[] = [];

export function useMyConcertMap(options: UseMyConcertMapOptions = {}) {
  const { userId = null, enabled = true, year = 'all' } = options;
  const queryClient = useQueryClient();
  const cacheKey = userId ? `myMap:${userId}` : null;
  const queryKey = userId ? queryKeys.myMap(userId) : (['myMap', 'disabled'] as const);

  useEffect(() => {
    if (!cacheKey || !userId) return;
    void seedQueryClientFromCache(queryClient, queryKey, () =>
      readOfflineQuery<Show[]>(cacheKey)
    );
  }, [cacheKey, queryClient, queryKey, userId]);

  const query = useQuery<Show[]>({
    queryKey,
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchAttendedShowsForMap(userId!),
      readCache: () => (cacheKey ? readOfflineQuery<Show[]>(cacheKey) : Promise.resolve(null)),
      writeCache: (shows) => (cacheKey ? writeOfflineQuery(cacheKey, shows) : Promise.resolve()),
    }),
    enabled: enabled && Boolean(userId),
    placeholderData: (previous) => previous,
    refetchOnMount: 'always',
  });

  const attendedShows = query.data ?? EMPTY;

  const filteredShows = useMemo(
    () => filterAttendedShowsByYear(attendedShows, year),
    [attendedShows, year]
  );

  const mapData: MyMapData = useMemo(() => buildMyMapData(filteredShows), [filteredShows]);
  const allYearsData: MyMapData = useMemo(() => buildMyMapData(attendedShows), [attendedShows]);

  return {
    attendedShows,
    filteredShows,
    mapData,
    allYearsData,
    isLoading: query.isPending && query.data === undefined,
    error:
      query.isError && query.data === undefined
        ? query.error instanceof Error
          ? query.error.message
          : 'Failed to load concert map'
        : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
