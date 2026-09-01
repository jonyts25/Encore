import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { fetchUpcomingShows } from '../api';
import type { Show } from '../types';

export function useUpcomingShows() {
  const { t } = useTranslation();
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingShows();
      setShows(data);
    } catch (err) {
      setShows([]);
      setError(err instanceof Error ? err.message : t('events.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { shows, isLoading, error, refetch };
}
