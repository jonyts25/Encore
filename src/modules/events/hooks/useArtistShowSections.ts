import { useQuery } from '@tanstack/react-query';

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

  const query = useQuery({
    queryKey: queryKeys.artistShows(artistId, userId),
    queryFn: () => fetchArtistShowSections(artistId, userId),
    enabled: enabled && Boolean(artistId),
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
