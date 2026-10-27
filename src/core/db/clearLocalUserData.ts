import 'expo-sqlite/localStorage/install';

import { queryClient } from '@/core/query/client';
import { clearLastKnownUser } from '@/modules/identity/lastKnownUser';

import { clearAllOfflineQueries } from './offlineQueryCache';

export async function clearLocalUserData(userId: string | null): Promise<void> {
  await clearAllOfflineQueries();
  clearLastKnownUser();

  try {
    if (userId) {
      globalThis.localStorage.removeItem(`encore-rq-${userId}`);
    }
    globalThis.localStorage.removeItem('encore-rq-guest');
  } catch {
    // ignore
  }

  queryClient.clear();
}
