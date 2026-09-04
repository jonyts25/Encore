import { useCallback, useEffect, useState } from 'react';

import { fetchArtistShowSections } from '../api';
import type { ArtistShowSections } from '../types';

type UseArtistShowSectionsOptions = {
  artistId: string;
  accessToken?: string | null;
  enabled?: boolean;
};

const EMPTY_SECTIONS: ArtistShowSections = {
  yours: [],
  other: [],
};

export function useArtistShowSections(options: UseArtistShowSectionsOptions) {
  const { artistId, accessToken = null, enabled = true } = options;
  const [sections, setSections] = useState<ArtistShowSections>(EMPTY_SECTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !artistId) {
      setSections(EMPTY_SECTIONS);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchArtistShowSections(artistId, accessToken);
      setSections(data);
    } catch (err) {
      setSections(EMPTY_SECTIONS);
      setError(err instanceof Error ? err.message : 'Failed to load artist shows');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, artistId, enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { sections, isLoading, error, refetch };
}
