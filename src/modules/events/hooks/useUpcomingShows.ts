import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { fetchUpcomingShows } from '../api';
import type { Show } from '../types';

type UseUpcomingShowsOptions = {
  followedOnly?: boolean;
  accessToken?: string | null;
  enabled?: boolean;
};

export function useUpcomingShows(options: UseUpcomingShowsOptions = {}) {
  const { followedOnly = false, accessToken = null, enabled = true } = options;
  const { t } = useTranslation();
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setShows([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingShows({
        followed: followedOnly,
        accessToken: followedOnly ? accessToken ?? undefined : undefined,
      });
      setShows(data);
    } catch (err) {
      setShows([]);
      setError(err instanceof Error ? err.message : t('events.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, enabled, followedOnly, t]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { shows, isLoading, error, refetch };
}
