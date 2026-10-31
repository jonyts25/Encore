import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

import { queryKeys } from '@/core/query';
import { isQueryInitialLoad } from '@/core/query/queryLoadState';
import { useSession } from '@/modules/identity';

import { flushPendingMemories, getMemoryForShow } from '../memoryApi';
import type { ShowMemory } from '../types';

export function useShowMemory(showId: string, enabled = true) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId) return;
    void flushPendingMemories(userId).then(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memory(showId, userId) });
    });
  }, [enabled, queryClient, showId, userId]);

  const query = useQuery<ShowMemory | null>({
    queryKey: userId ? queryKeys.memory(showId, userId) : ['memory', 'disabled'],
    queryFn: () => getMemoryForShow(userId!, showId),
    enabled: enabled && Boolean(userId && showId),
    placeholderData: (previous) => previous,
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await flushPendingMemories(userId);
    await query.refetch();
  }, [query, userId]);

  return {
    memory: query.data ?? null,
    isLoading: isQueryInitialLoad(query.isPending, query.data),
    refresh,
    userId,
  };
}
