import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { readOfflineQuery, writeOfflineQuery } from '@/core/db/offlineQueryCache';
import { useTranslation } from '@/core/i18n';
import { createStaleWhileRevalidateQueryFn } from '@/core/query/staleWhileRevalidate';
import { queryKeys } from '@/core/query';
import { useSession } from '@/modules/identity';

import { fetchShowById, getUserShowStatus, removeShowStatus, setShowStatus } from '../api';
import { prefetchShowPack } from '../showPack';
import type { Show, ShowStatus } from '../types';

export function useShowStatus(showId: string) {
  const { t } = useTranslation();
  const { isGuest, session, user } = useSession();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const cacheKey = userId ? `showStatus:${showId}:${userId}` : null;

  useEffect(() => {
    if (!cacheKey || !userId) return;
    void readOfflineQuery<ShowStatus | null>(cacheKey).then((cached) => {
      if (cached !== null) {
        queryClient.setQueryData(queryKeys.showStatus(showId, userId), cached);
      }
    });
  }, [cacheKey, queryClient, showId, userId]);

  const statusQuery = useQuery<ShowStatus | null>({
    queryKey: userId ? queryKeys.showStatus(showId, userId) : ['showStatus', 'disabled'],
    queryFn: createStaleWhileRevalidateQueryFn({
      fetchFresh: () => getUserShowStatus(showId),
      readCache: () =>
        cacheKey ? readOfflineQuery<ShowStatus | null>(cacheKey) : Promise.resolve(null),
      writeCache: (status) =>
        cacheKey ? writeOfflineQuery(cacheKey, status) : Promise.resolve(),
    }),
    enabled: !isGuest && Boolean(userId && showId),
    placeholderData: (previous) => previous,
  });

  const invalidateRelated = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.home(userId) }),
      queryClient.invalidateQueries({ queryKey: ['artistShows'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.upcoming(true, userId) }),
    ]);
  }, [queryClient, userId]);

  const triggerShowPack = useCallback(
    async (nextStatus: ShowStatus) => {
      if (nextStatus !== 'voy' && nextStatus !== 'interesado') return;

      let show =
        queryClient.getQueryData<Show | null>(queryKeys.show(showId)) ?? (await fetchShowById(showId));
      if (show) {
        void prefetchShowPack(show, queryClient, { force: true });
      }
    },
    [queryClient, showId]
  );

  const updateMutation = useMutation({
    mutationFn: (nextStatus: ShowStatus) =>
      setShowStatus(showId, nextStatus, session?.access_token ?? null, userId!),
    onSuccess: async (row) => {
      if (userId) {
        queryClient.setQueryData(queryKeys.showStatus(showId, userId), row.status);
      }
      await invalidateRelated();
      await triggerShowPack(row.status);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => removeShowStatus(showId, session!.access_token!),
    onSuccess: async () => {
      if (userId) {
        queryClient.setQueryData(queryKeys.showStatus(showId, userId), null);
      }
      await invalidateRelated();
    },
  });

  const ensureOnline = useCallback(() => {
    if (onlineManager.isOnline()) {
      setOfflineMessage(null);
      return true;
    }
    setOfflineMessage(t('offline.requiresConnection'));
    return false;
  }, [t]);

  const updateStatus = useCallback(
    async (nextStatus: ShowStatus) => {
      if (!session?.access_token) return;
      if (!ensureOnline()) {
        throw new Error(t('offline.requiresConnection'));
      }
      setOfflineMessage(null);
      await updateMutation.mutateAsync(nextStatus);
    },
    [ensureOnline, session?.access_token, t, updateMutation]
  );

  const removeStatus = useCallback(async () => {
    if (!session?.access_token) return;
    if (!ensureOnline()) {
      throw new Error(t('offline.requiresConnection'));
    }
    setOfflineMessage(null);
    await removeMutation.mutateAsync();
  }, [ensureOnline, removeMutation, session?.access_token, t]);

  const mutationError =
    updateMutation.error instanceof Error
      ? updateMutation.error.message
      : removeMutation.error instanceof Error
        ? removeMutation.error.message
        : null;

  return {
    status: statusQuery.data ?? null,
    isLoading: statusQuery.isPending && statusQuery.data === undefined,
    isMutating: updateMutation.isPending || removeMutation.isPending,
    error:
      offlineMessage ??
      mutationError ??
      (statusQuery.isError && statusQuery.data === undefined ? t('events.loadError') : null),
    refetch: statusQuery.refetch,
    updateStatus,
    removeStatus,
    requiresAuth: isGuest,
  };
}
