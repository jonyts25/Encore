import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
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

  useEffect(() => {
    if (!cacheKey) return;
    void readOfflineQuery<Show[]>(cacheKey).then((cached) => {
      if (cached && userId) {
        queryClient.setQueryData(queryKeys.myMap(userId), cached);
      }
    });
  }, [cacheKey, queryClient, userId]);

  const query = useQuery<Show[]>({
    queryKey: userId ? queryKeys.myMap(userId) : ['myMap', 'disabled'],
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchAttendedShowsForMap(userId!),
      readCache: () => (cacheKey ? readOfflineQuery<Show[]>(cacheKey) : Promise.resolve(null)),
      writeCache: (shows) => (cacheKey ? writeOfflineQuery(cacheKey, shows) : Promise.resolve()),
    }),
    enabled: enabled && Boolean(userId),
    placeholderData: (previous) => previous,
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
    isLoading: query.isPending && !query.data,
    error:
      query.isError && !query.data
        ? query.error instanceof Error
          ? query.error.message
          : 'Failed to load concert map'
        : null,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
