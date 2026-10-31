import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { TFunction } from 'i18next';
import { fetchHomeShowSections } from '@/modules/events/api';
import { goingReminderTriggerUtc } from '@/modules/events/visibility';
import type { Show } from '@/modules/events/types';

export const SHOW_GOING_REMINDER_PREFIX = 'encore.showGoingReminder.';

export function showGoingReminderNotificationId(showId: string): string {
  return `${SHOW_GOING_REMINDER_PREFIX}${showId}`;
}

export async function cancelShowGoingReminder(showId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(showGoingReminderNotificationId(showId));
}

async function scheduleShowGoingReminderForShow(show: Show, t: TFunction): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const triggerDate = goingReminderTriggerUtc(show);
  const id = showGoingReminderNotificationId(show.id);
  await Notifications.cancelScheduledNotificationAsync(id);
  if (!triggerDate) return;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: t('notifications.goingReminder.title'),
      body: t('notifications.goingReminder.body', { artist: show.artist.name }),
      data: { showId: show.id, screen: 'setlist' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function scheduleShowGoingReminder(show: Show, t: TFunction): Promise<void> {
  if (Platform.OS === 'web') return;
  await scheduleShowGoingReminderForShow(show, t);
}

export async function syncFutureGoingReminders(
  userId: string,
  accessToken: string | null | undefined,
  t: TFunction
): Promise<void> {
  if (Platform.OS === 'web') return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const sections = await fetchHomeShowSections(userId, accessToken);
  const voyShows = [...sections.going, ...sections.goingAttendancePending];

  const activeIds = new Set(voyShows.map((show) => show.id));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (
      request.identifier.startsWith(SHOW_GOING_REMINDER_PREFIX) &&
      !activeIds.has(request.identifier.slice(SHOW_GOING_REMINDER_PREFIX.length))
    ) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }

  await Promise.all(voyShows.map((show) => scheduleShowGoingReminderForShow(show, t)));
}

export async function ensureGoingReminderPermission(t: TFunction): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return true;
  if (existing.status === 'denied') return false;

  const { Alert } = await import('react-native');
  return new Promise((resolve) => {
    Alert.alert(t('notifications.goingReminder.permissionTitle'), t('notifications.goingReminder.permissionBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => resolve(false),
      },
      {
        text: t('common.continue'),
        onPress: () => {
          void (async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            resolve(status === 'granted');
          })();
        },
      },
    ]);
  });
}
