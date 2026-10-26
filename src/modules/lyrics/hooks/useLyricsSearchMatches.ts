import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/core/query';

import { searchLyricsMatches } from '../api';
import {
  normalizeSongSearchQuery,
  shouldFetchRemoteLyricsSearch,
} from '@/modules/live/liveSongSearchLogic';

type UseLyricsSearchMatchesOptions = {
  artistName: string;
  searchRaw: string;
  catalogMatchCount: number;
  isOffline: boolean;
};

export function useLyricsSearchMatches({
  artistName,
  searchRaw,
  catalogMatchCount,
  isOffline,
}: UseLyricsSearchMatchesOptions) {
  const normalizedQuery = normalizeSongSearchQuery(searchRaw);
  const titleQuery = searchRaw.trim();
  const enabled = shouldFetchRemoteLyricsSearch(isOffline, normalizedQuery, catalogMatchCount);

  const query = useQuery({
    queryKey: queryKeys.lyricsSearchMatches(artistName, titleQuery),
    queryFn: () => searchLyricsMatches(artistName, titleQuery),
    enabled: enabled && Boolean(artistName),
    staleTime: 60_000,
  });

  return {
    matches: query.data ?? [],
    isSearching: enabled && query.isFetching,
    enabled,
  };
}
