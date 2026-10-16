import { useQuery } from '@tanstack/react-query';

import { useTranslation } from '@/core/i18n';
import { queryKeys } from '@/core/query';

import { fetchShowPrediction } from '../api';
import type { SetlistPrediction } from '../types';

type UseShowPredictionOptions = {
  enabled?: boolean;
};

export function useShowPrediction(showId: string, options: UseShowPredictionOptions = {}) {
  const { enabled = true } = options;
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: queryKeys.prediction(showId),
    queryFn: () => fetchShowPrediction(showId),
    enabled: enabled && Boolean(showId),
  });

  const prediction: SetlistPrediction | null = query.data ?? null;
  const isLoading = query.isPending && query.data === undefined;
  const error =
    query.isError && !prediction
      ? query.error instanceof Error
        ? query.error.message
        : t('setlist.loadError')
      : null;

  return { prediction, isLoading, error, refetch: query.refetch, isFetching: query.isFetching };
}
