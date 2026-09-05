import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import { listPublicArtists, searchLocalArtists, searchArtistsWithResolution } from '../api';
import type { Artist } from '../types';

export function useArtistCatalogSearch() {
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      setIsResolving(false);
      setError(null);
      try {
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
          const localMatches = await searchLocalArtists(trimmedQuery);
          if (localMatches.length > 0) {
            setArtists(localMatches);
            return;
          }

          setIsLoading(false);
          setIsResolving(true);
          const data = await searchArtistsWithResolution(trimmedQuery);
          setArtists(data);
          return;
        }

        const data = await listPublicArtists();
        setArtists(data);
      } catch (err) {
        setArtists([]);
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        setIsLoading(false);
        setIsResolving(false);
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
    isResolving,
    error,
    refetch: () => load(query),
  };
}
