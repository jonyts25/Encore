import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { queryKeys } from '@/core/query';
import { useSession } from '@/modules/identity';

import { fetchShowMediaForShow, flushPendingShowMedia } from '../showMediaApi';

export function useShowMedia(showId: string, enabled: boolean) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return;
    void flushPendingShowMedia(userId).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.showMedia(showId, userId) });
    });
  }, [enabled, queryClient, showId, userId]);

  const query = useQuery({
    queryKey: userId ? queryKeys.showMedia(showId, userId) : ['showMedia', 'disabled'],
    queryFn: () => fetchShowMediaForShow(showId),
    enabled: enabled && Boolean(userId),
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await flushPendingShowMedia(userId);
    await query.refetch();
  }, [query, userId]);

  return {
    media: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refresh,
    userId,
  };
}
