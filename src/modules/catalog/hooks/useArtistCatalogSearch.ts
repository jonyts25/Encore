import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@/core/i18n';

import {
  ARTIST_CATALOG_SEARCH_DEBOUNCE_MS,
  isStaleRequest,
  mergeArtistLists,
  shouldAutoFetchRemote,
  shouldOfferWorldwideSearch,
} from '../artistCatalogSearchLogic';
import {
  confirmArtistResolution,
  fetchArtistSearch,
  listFollowedArtists,
  listPublicArtists,
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
  const [localArtists, setLocalArtists] = useState<Artist[]>([]);
  const [remoteArtists, setRemoteArtists] = useState<Artist[]>([]);
  const [candidates, setCandidates] = useState<ArtistResolutionCandidate[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteFetchedForQuery, setRemoteFetchedForQuery] = useState(false);

  const requestGenerationRef = useRef(0);
  const inFlightQueryRef = useRef<string | null>(null);
  const forceRemoteRef = useRef(false);

  const followedOnly = viewMode === 'followed' && Boolean(userId);

  const artists = useMemo(
    () => mergeArtistLists(localArtists, remoteArtists),
    [localArtists, remoteArtists]
  );

  const runSearch = useCallback(
    async (searchQuery: string, forceRemote: boolean) => {
      const trimmedQuery = searchQuery.trim();
      const flightKey = `${trimmedQuery}|${forceRemote ? 'remote' : 'local'}`;

      if (inFlightQueryRef.current === flightKey) {
        return;
      }

      inFlightQueryRef.current = flightKey;
      const generation = ++requestGenerationRef.current;

      setError(null);
      setCandidates([]);
      setRemoteArtists([]);
      setRemoteFetchedForQuery(false);

      try {
        if (followedOnly && userId) {
          setIsLoading(true);
          setIsResolving(false);
          const data = trimmedQuery
            ? await searchFollowedArtists(userId, trimmedQuery)
            : await listFollowedArtists(userId);
          if (isStaleRequest(generation, requestGenerationRef.current)) return;
          setLocalArtists(data);
          setRemoteArtists([]);
          return;
        }

        if (!trimmedQuery) {
          setIsLoading(true);
          setIsResolving(false);
          const data = await listPublicArtists();
          if (isStaleRequest(generation, requestGenerationRef.current)) return;
          setLocalArtists(data);
          setRemoteArtists([]);
          return;
        }

        setIsLoading(true);
        setIsResolving(false);
        const localMatches = await searchLocalArtists(trimmedQuery);
        if (isStaleRequest(generation, requestGenerationRef.current)) return;
        setLocalArtists(localMatches);

        if (!shouldAutoFetchRemote(localMatches.length, forceRemote)) {
          return;
        }

        setIsLoading(false);
        setIsResolving(true);
        const result = await fetchArtistSearch(trimmedQuery);
        if (isStaleRequest(generation, requestGenerationRef.current)) return;

        setRemoteFetchedForQuery(true);
        setRemoteArtists(result.artists);
        setCandidates(result.source === 'ambiguous' ? result.candidates : []);
      } catch (err) {
        if (isStaleRequest(generation, requestGenerationRef.current)) return;
        setRemoteArtists([]);
        setCandidates([]);
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
      } finally {
        if (inFlightQueryRef.current === flightKey) {
          inFlightQueryRef.current = null;
        }
        if (!isStaleRequest(generation, requestGenerationRef.current)) {
          setIsLoading(false);
          setIsResolving(false);
        }
      }
    },
    [followedOnly, t, userId]
  );

  const searchWorldwide = useCallback(() => {
    forceRemoteRef.current = true;
    void runSearch(query, true);
  }, [query, runSearch]);

  const confirmCandidate = useCallback(
    async (mbid: string): Promise<Artist | null> => {
      setIsConfirming(true);
      setError(null);

      try {
        const artist = await confirmArtistResolution(mbid);
        setRemoteArtists([artist]);
        setLocalArtists([]);
        setCandidates([]);
        return artist;
      } catch (err) {
        setError(err instanceof Error ? err.message : t('catalog.loadError'));
        return null;
      } finally {
        setIsConfirming(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!enabled) return;

    forceRemoteRef.current = false;
    const handle = setTimeout(() => {
      void runSearch(query, forceRemoteRef.current);
    }, ARTIST_CATALOG_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [enabled, query, runSearch]);

  const trimmedQuery = query.trim();
  const showWorldwideSearchAction = shouldOfferWorldwideSearch(
    trimmedQuery,
    localArtists.length,
    remoteFetchedForQuery,
    isResolving
  );

  return {
    query,
    setQuery,
    artists,
    localArtists,
    candidates,
    isLoading,
    isResolving,
    isConfirming,
    error,
    confirmCandidate,
    searchWorldwide,
    showWorldwideSearchAction,
    followedOnly,
    refetch: () => runSearch(query, forceRemoteRef.current || remoteFetchedForQuery),
  };
}
