import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { fetchShowPrediction } from '../api';
import type { SetlistPrediction } from '../types';

export function useShowPrediction(showId: string) {
  const { t } = useTranslation();
  const [prediction, setPrediction] = useState<SetlistPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchShowPrediction(showId);
      setPrediction(data);
    } catch (err) {
      setPrediction(null);
      setError(err instanceof Error ? err.message : t('setlist.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [showId, t]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { prediction, isLoading, error, refetch };
}
