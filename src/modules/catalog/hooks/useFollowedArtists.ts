import { useCallback, useEffect, useState } from 'react';

import { listFollowedArtists } from '../api';
import type { FollowedArtist } from '../types';

export function useFollowedArtists(userId: string | null, enabled = true) {
  const [artists, setArtists] = useState<FollowedArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !userId) {
      setArtists([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setArtists(await listFollowedArtists(userId));
    } catch (err) {
      setArtists([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { artists, isLoading, error, refetch };
}
