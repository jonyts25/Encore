import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { listPublicArtists, searchPublicArtists } from '../api';
import type { Artist } from '../types';

export function useArtistCatalogSearch() {
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = searchQuery.trim()
          ? await searchPublicArtists(searchQuery)
          : await listPublicArtists();
        setArtists(data);
      } catch (err) {
        setArtists([]);
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      void load(query);
    }, 250);

    return () => clearTimeout(handle);
  }, [load, query]);

  const results = useMemo(() => artists, [artists]);

  return {
    query,
    setQuery,
    artists: results,
    isLoading,
    error,
    refetch: () => load(query),
  };
}
