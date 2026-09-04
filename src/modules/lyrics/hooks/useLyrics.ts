import { useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { fetchLyrics } from '../api';
import type { LyricsResult } from '../types';

export function useLyrics(artist: string, title: string) {
  const { t } = useTranslation();
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    if (!artist.trim() || !title.trim()) {
      setLyrics(null);
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const data = await fetchLyrics(artist, title);
      setLyrics(data);
      setNotFound(!data);
    } catch (err) {
      setLyrics(null);
      setNotFound(false);
      setError(err instanceof Error ? err.message : t('lyrics.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [artist, title, t]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { lyrics, isLoading, error, notFound, refetch };
}
