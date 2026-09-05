import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import {
  confirmArtistResolution,
  listFollowedArtists,
  listPublicArtists,
  searchArtistsWithResolution,
  searchFollowedArtists,
  searchLocalArtists,
} from '../api';
import type { Artist, ArtistResolutionCandidate } from '../types';

export type CatalogViewMode = 'all' | 'followed';

type UseArtistCatalogSearchOptions = {
  viewMode: CatalogViewMode;
  userId: string | null;
  enabled?: boolean;
};

export function useArtistCatalogSearch(options: UseArtistCatalogSearchOptions) {
  const { viewMode, userId, enabled = true } = options;
  const { t } = useTranslation();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [candidates, setCandidates] = useState<ArtistResolutionCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followedOnly = viewMode === 'followed' && Boolean(userId);

  const load = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      setIsResolving(false);
      setIsConfirming(false);
      setError(null);
      setCandidates([]);

      try {
        const trimmedQuery = searchQuery.trim();

        if (followedOnly && userId) {
          const data = trimmedQuery
            ? await searchFollowedArtists(userId, trimmedQuery)
            : await listFollowedArtists(userId);
          setArtists(data);
          return;
        }

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
    [followedOnly, t, userId]
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
    if (!enabled) return;

    const handle = setTimeout(() => {
      void load(query);
    }, 250);

    return () => clearTimeout(handle);
  }, [enabled, load, query]);

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
    followedOnly,
    refetch: () => load(query),
  };
}
