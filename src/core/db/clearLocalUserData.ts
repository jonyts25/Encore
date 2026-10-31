import 'expo-sqlite/localStorage/install';

import { queryClient } from '@/core/query/client';
import { clearLastKnownUser } from '@/modules/identity/lastKnownUser';

import { clearAllOfflineQueries } from './offlineQueryCache';
import { clearShowMediaPending } from './showMediaQueue';

export async function clearLocalUserData(userId: string | null): Promise<void> {
  await clearAllOfflineQueries();
  await clearShowMediaPending();
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
