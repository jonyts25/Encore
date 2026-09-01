import { useCallback, useEffect, useState } from 'react';

import { useSession } from '@/modules/identity';

import { getUserShowStatus, setShowStatus } from '../api';
import type { ShowStatus } from '../types';

export function useShowStatus(showId: string) {
  const { isGuest, session } = useSession();
  const [status, setStatus] = useState<ShowStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (isGuest || !session) {
      setStatus(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const current = await getUserShowStatus(showId);
      setStatus(current);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, session, showId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const updateStatus = useCallback(
    async (nextStatus: ShowStatus) => {
      if (!session?.access_token) return;

      setIsMutating(true);
      setError(null);
      try {
        const row = await setShowStatus(showId, nextStatus, session.access_token);
        setStatus(row.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [session, showId]
  );

  return {
    status,
    isLoading,
    isMutating,
    error,
    refetch,
    updateStatus,
    requiresAuth: isGuest,
  };
}
