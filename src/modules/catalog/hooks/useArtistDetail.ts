import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/core/i18n';
import { isQueryInitialLoad } from '@/core/query/queryLoadState';

import { getArtistById } from '../api';
import type { Artist } from '../types';

export function useArtistDetail(artistId: string) {
  const { t } = useTranslation();

  const query = useQuery<Artist | null>({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistById(artistId),
    enabled: Boolean(artistId),
    placeholderData: (previous) => previous,
  });

  const artist = query.data ?? null;
  const isLoading = isQueryInitialLoad(query.isPending, query.data);
  const error =
    query.isError && !artist
      ? query.error instanceof Error
        ? query.error.message
        : t('catalog.loadError')
      : !isLoading && !query.isError && artistId && artist === null
        ? t('catalog.artistNotFound')
        : null;

  return {
    artist,
    isLoading,
    error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
