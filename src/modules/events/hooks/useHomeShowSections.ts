import { useCallback, useEffect, useState } from 'react';

import { fetchHomeShowSections } from '../api';
import type { HomeShowSections } from '../types';

type UseHomeShowSectionsOptions = {
  accessToken?: string | null;
  enabled?: boolean;
};

const EMPTY_SECTIONS: HomeShowSections = {
  going: [],
  interested: [],
  forYou: [],
  attended: [],
};

export function useHomeShowSections(options: UseHomeShowSectionsOptions = {}) {
  const { accessToken = null, enabled = true } = options;
  const [sections, setSections] = useState<HomeShowSections>(EMPTY_SECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !accessToken) {
      setSections(EMPTY_SECTIONS);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchHomeShowSections(accessToken);
      setSections(data);
    } catch (err) {
      setSections(EMPTY_SECTIONS);
      setError(err instanceof Error ? err.message : 'Failed to load home sections');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { sections, isLoading, error, refetch };
}
