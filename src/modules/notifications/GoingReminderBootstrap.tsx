import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useSession } from '@/modules/identity';

import { syncFutureGoingReminders } from './showGoingReminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function GoingReminderBootstrap() {
  const { user, session, isGuest } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const syncedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const showId = response.notification.request.content.data?.showId;
      if (typeof showId === 'string' && showId.length > 0) {
        router.push(`/show/${showId}/setlist`);
      }
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web' || isGuest || !user?.id) return;
    if (syncedForUserRef.current === user.id) return;
    syncedForUserRef.current = user.id;

    void syncFutureGoingReminders(user.id, session?.access_token ?? null, t).catch(() => {
      syncedForUserRef.current = null;
    });
  }, [isGuest, session?.access_token, t, user?.id]);

  return null;
}
