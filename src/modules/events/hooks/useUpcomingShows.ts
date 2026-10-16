import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';

import { fetchUpcomingShows } from '../api';
import type { Show } from '../types';

type UseUpcomingShowsOptions = {
  followedOnly?: boolean;
  userId?: string | null;
  accessToken?: string | null;
  enabled?: boolean;
};

export function useUpcomingShows(options: UseUpcomingShowsOptions = {}) {
  const { followedOnly = false, userId = null, accessToken = null, enabled = true } = options;
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: queryKeys.upcoming(followedOnly, userId),
    queryFn: () =>
      fetchUpcomingShows({
        followed: followedOnly,
        accessToken: followedOnly ? accessToken ?? undefined : undefined,
      }),
    enabled,
  });

  const shows: Show[] = query.data ?? [];
  const isLoading = query.isPending && !query.data;
  const error =
    query.isError && shows.length === 0
      ? query.error instanceof Error
        ? query.error.message
        : t('events.loadError')
      : null;

  return { shows, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
