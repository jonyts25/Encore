import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { dismissHomeFeedItem, listDismissedHomeFeedIds } from '@/core/db/homeFeedDismissed';
import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { seedQueryClientFromCache } from '@/core/query/seedQueryClientFromCache';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';
import { isQueryInitialLoad } from '@/core/query/queryLoadState';

import { fetchHomeFeedRaw } from '../homeFeedApi';
import { buildHomeFeed } from '../homeFeedLogic';
import type { HomeFeedItem, HomeFeedRawData } from '../homeFeedTypes';

type UseHomeFeedOptions = {
  userId?: string | null;
  enabled?: boolean;
};

type HomeFeedCachePayload = {
  raw: HomeFeedRawData;
  items: HomeFeedItem[];
};

export function useHomeFeed(options: UseHomeFeedOptions = {}) {
  const { userId = null, enabled = true } = options;
  const queryClient = useQueryClient();
  const cacheKey = userId ? `homeFeed:${userId}` : null;
  const queryKey = userId ? queryKeys.homeFeed(userId) : (['homeFeed', 'disabled'] as const);
  const [localDismissed, setLocalDismissed] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    void listDismissedHomeFeedIds(userId).then(setLocalDismissed);
  }, [userId]);

  useEffect(() => {
    if (!cacheKey || !userId) return;
    void seedQueryClientFromCache(queryClient, queryKey, () =>
      readOfflineQuery<HomeFeedCachePayload>(cacheKey)
    );
  }, [cacheKey, queryClient, queryKey, userId]);

  const query = useQuery<HomeFeedCachePayload>({
    queryKey,
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: async () => {
        const raw = await fetchHomeFeedRaw(userId!);
        const items = buildHomeFeed(raw);
        return { raw, items };
      },
      readCache: () => (cacheKey ? readOfflineQuery<HomeFeedCachePayload>(cacheKey) : Promise.resolve(null)),
      writeCache: (payload) =>
        cacheKey ? writeOfflineQuery(cacheKey, payload) : Promise.resolve(),
    }),
    enabled: enabled && Boolean(userId),
    placeholderData: (previous) => previous,
  });

  const items = useMemo(() => {
    const cached = query.data?.items ?? [];
    if (localDismissed.length === 0) return cached;
    const dismissed = new Set(localDismissed);
    return cached.filter((item) => !dismissed.has(item.id));
  }, [localDismissed, query.data?.items]);

  const dismissItem = useCallback(
    async (itemId: string) => {
      if (!userId) return;
      setLocalDismissed((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
      await dismissHomeFeedItem(userId, itemId);
      queryClient.setQueryData<HomeFeedCachePayload | undefined>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.filter((item) => item.id !== itemId),
        };
      });
    },
    [queryClient, queryKey, userId]
  );

  const isLoading = isQueryInitialLoad(query.isPending, query.data);

  return {
    items,
    isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    dismissItem,
  };
}
