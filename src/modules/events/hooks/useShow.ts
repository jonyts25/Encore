import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';

import { fetchShowById } from '../api';

export function useShow(showId: string) {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: queryKeys.show(showId),
    queryFn: () => fetchShowById(showId),
    enabled: Boolean(showId),
  });

  const isLoading = query.isPending && query.data === undefined;
  const show = query.data ?? null;

  let error: string | null = null;
  if (query.isError && !show) {
    error = query.error instanceof Error ? query.error.message : t('events.loadError');
  } else if (!isLoading && show === null && query.isSuccess) {
    error = t('events.showNotFound');
  }

  return { show, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
