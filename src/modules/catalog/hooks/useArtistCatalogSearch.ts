import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import {
  confirmArtistResolution,
  listPublicArtists,
  searchArtistsWithResolution,
  searchLocalArtists,
} from '../api';
import type { Artist, ArtistResolutionCandidate } from '../types';

export function useArtistCatalogSearch() {
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [candidates, setCandidates] = useState<ArtistResolutionCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      setIsResolving(false);
      setIsConfirming(false);
      setError(null);
      setCandidates([]);

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
          const result = await searchArtistsWithResolution(trimmedQuery);
          setArtists(result.artists);
          setCandidates(result.source === 'ambiguous' ? result.candidates : []);
          return;
        }

        const data = await listPublicArtists();
        setArtists(data);
      } catch (err) {
        setArtists([]);
        setCandidates([]);
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        setIsLoading(false);
        setIsResolving(false);
      }
    },
    [t]
  );

  const confirmCandidate = useCallback(
    async (mbid: string) => {
      setIsConfirming(true);
      setError(null);

      try {
        const artist = await confirmArtistResolution(mbid);
        setArtists([artist]);
        setCandidates([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        setIsConfirming(false);
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
    candidates,
    isLoading,
    isResolving,
    isConfirming,
    error,
    confirmCandidate,
    refetch: () => load(query),
  };
}
