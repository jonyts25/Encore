import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useIsOffline } from '@/core/network/useIsOffline';
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

  const query = useQuery({
    queryKey: userId ? queryKeys.home(userId) : ['home', 'disabled'],
    queryFn: () => fetchHomeShowSections(userId!, accessToken),
    enabled: enabled && Boolean(userId),
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
