import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useIsOffline } from '@/core/network/useIsOffline';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchHomeShowSections } from '../api';
import { prefetchGoingShowPacks } from '../showPack';
import type { HomeShowSections } from '../types';

type UseHomeShowSectionsOptions = {
  userId?: string | null;
  accessToken?: string | null;
  enabled?: boolean;
};

const EMPTY_SECTIONS: HomeShowSections = {
  going: [],
  goingAttendancePending: [],
  interested: [],
  forYou: [],
  attended: [],
};

function hasSectionData(sections: HomeShowSections): boolean {
  return (
    sections.going.length > 0 ||
    sections.goingAttendancePending.length > 0 ||
    sections.interested.length > 0 ||
    sections.forYou.length > 0 ||
    sections.attended.length > 0
  );
}

export function useHomeShowSections(options: UseHomeShowSectionsOptions = {}) {
  const { userId = null, accessToken = null, enabled = true } = options;
  const isOffline = useIsOffline();
  const queryClient = useQueryClient();
  const cacheKey = userId ? `home:${userId}` : null;

  useEffect(() => {
    if (!cacheKey) return;
    void readOfflineQuery<HomeShowSections>(cacheKey).then((cached) => {
      if (cached && userId) {
        queryClient.setQueryData(queryKeys.home(userId), cached);
      }
    });
  }, [cacheKey, queryClient, userId]);

  const query = useQuery<HomeShowSections>({
    queryKey: userId ? queryKeys.home(userId) : ['home', 'disabled'],
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchHomeShowSections(userId!, accessToken),
      readCache: () => (cacheKey ? readOfflineQuery<HomeShowSections>(cacheKey) : Promise.resolve(null)),
      writeCache: (sections) =>
        cacheKey ? writeOfflineQuery(cacheKey, sections) : Promise.resolve(),
    }),
    enabled: enabled && Boolean(userId),
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (!query.data || !userId || isOffline) return;
    void prefetchGoingShowPacks(query.data.going, queryClient);
  }, [isOffline, query.data, queryClient, userId]);

  const sections = query.data ?? EMPTY_SECTIONS;
  const isLoading = query.isPending && !query.data;
  const error =
    query.isError && !hasSectionData(sections)
      ? query.error instanceof Error
        ? query.error.message
        : 'Failed to load home sections'
      : null;

  return {
    sections,
    isLoading,
    error,
    refetch: query.refetch,
    isOffline,
    isFetching: query.isFetching,
  };
}
