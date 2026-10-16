import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useEffect, useMemo, type ReactNode } from 'react';

import 'expo-sqlite/localStorage/install';

import { purgeExpiredLyrics } from '@/core/db/lyricsCache';
import { useSession } from '@/modules/identity';

import { QUERY_PERSIST_MAX_AGE_MS, queryClient } from './client';

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  const { user, lastKnownUser } = useSession();
  const userId = user?.id ?? lastKnownUser?.id ?? 'guest';

  const persistOptions = useMemo(
    () => ({
      persister: createSyncStoragePersister({
        storage: globalThis.localStorage,
        key: `encore-rq-${userId}`,
      }),
      maxAge: QUERY_PERSIST_MAX_AGE_MS,
    }),
    [userId]
  );

  useEffect(() => {
    void purgeExpiredLyrics();
  }, []);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      {children}
    </PersistQueryClientProvider>
  );
}
