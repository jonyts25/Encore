import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';

import { fetchArtistShowSections } from '../api';
import type { ArtistShowSections } from '../types';

type UseArtistShowSectionsOptions = {
  artistId: string;
  userId?: string | null;
  enabled?: boolean;
};

const EMPTY_SECTIONS: ArtistShowSections = {
  yours: [],
  other: [],
  attended: [],
};

function hasSectionData(sections: ArtistShowSections): boolean {
  return sections.yours.length > 0 || sections.other.length > 0 || sections.attended.length > 0;
}

export function useArtistShowSections(options: UseArtistShowSectionsOptions) {
  const { artistId, userId = null, enabled = true } = options;
  const queryClient = useQueryClient();
  const cacheKey = `artistShows:${artistId}:${userId ?? 'guest'}`;

  useEffect(() => {
    if (!artistId) return;
    void readOfflineQuery<ArtistShowSections>(cacheKey).then((cached) => {
      if (cached) {
        queryClient.setQueryData(queryKeys.artistShows(artistId, userId), cached);
      }
    });
  }, [artistId, cacheKey, queryClient, userId]);

  const query = useQuery<ArtistShowSections>({
    queryKey: queryKeys.artistShows(artistId, userId),
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => fetchArtistShowSections(artistId, userId),
      readCache: () => readOfflineQuery<ArtistShowSections>(cacheKey),
      writeCache: (sections) => writeOfflineQuery(cacheKey, sections),
    }),
    enabled: enabled && Boolean(artistId),
    placeholderData: (previous) => previous,
  });

  const sections = query.data ?? EMPTY_SECTIONS;
  const isLoading = query.isPending && !query.data;
  const error =
    query.isError && !hasSectionData(sections)
      ? query.error instanceof Error
        ? query.error.message
        : 'Failed to load artist shows'
      : null;

  return { sections, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
