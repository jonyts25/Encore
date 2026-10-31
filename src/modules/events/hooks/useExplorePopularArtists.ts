import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { seedQueryClientFromCache } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';
import type { ArtistSummary } from '../types';

import { fetchExplorePopularArtists } from '../api';
import { rankPopularArtistsFromShows } from '../exploreLogic';
import type { Show } from '../types';

const CACHE_KEY = 'explore:popular-artists';

type UseExplorePopularArtistsOptions = {
  fallbackShows: Show[];
  enabled?: boolean;
};

export function useExplorePopularArtists(options: UseExplorePopularArtistsOptions) {
  const { fallbackShows, enabled = true } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    void seedQueryClientFromCache(
      queryClient,
      queryKeys.explorePopular(),
      () => readOfflineQuery<ArtistSummary[]>(CACHE_KEY),
      (cached) => cached.length > 0
    );
  }, [queryClient]);

  const query = useQuery<ArtistSummary[]>({
    queryKey: queryKeys.explorePopular(),
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: fetchExplorePopularArtists,
      readCache: () => readOfflineQuery<ArtistSummary[]>(CACHE_KEY),
      writeCache: (artists) => writeOfflineQuery(CACHE_KEY, artists),
    }),
    enabled,
    placeholderData: (previous) => previous,
  });

  const fromNetwork = query.data ?? [];
  const artists =
    fromNetwork.length > 0 ? fromNetwork : rankPopularArtistsFromShows(fallbackShows, 12);

  return {
    artists,
    isLoading: query.isPending && fromNetwork.length === 0,
    refetch: query.refetch,
  };
}
