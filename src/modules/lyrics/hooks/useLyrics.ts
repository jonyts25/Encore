import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';

import { fetchLyrics } from '../api';
import type { LyricsResult } from '../types';

export function useLyrics(artist: string, title: string) {
  const { t } = useTranslation();
  const trimmedArtist = artist.trim();
  const trimmedTitle = title.trim();
  const enabled = Boolean(trimmedArtist && trimmedTitle);

  const query = useQuery({
    queryKey: queryKeys.lyrics(trimmedArtist, trimmedTitle),
    queryFn: () => fetchLyrics(trimmedArtist, trimmedTitle),
    enabled,
  });

  const lyrics: LyricsResult | null = query.data ?? null;
  const isLoading = enabled && query.isPending && query.data === undefined;
  const notFound = enabled && query.isSuccess && !lyrics;
  const error =
    query.isError && !lyrics
      ? query.error instanceof Error
        ? query.error.message
        : t('lyrics.loadError')
      : null;

  return { lyrics, isLoading, error, notFound, refetch: query.refetch, isFetching: query.isFetching };
}
