import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { SegmentedControl } from '@/core/ui';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowStatus } from '../hooks/useShowStatus';
import type { ShowStatus } from '../types';

type ShowStatusButtonsProps = {
  showId: string;
  showDate?: string;
  appearance?: 'default' | 'showDetail';
};

function hasShowStarted(showDate: string): boolean {
  return Date.now() >= new Date(showDate).getTime();
}

export function ShowStatusButtons({ showId, showDate, appearance = 'default' }: ShowStatusButtonsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, isLoading, isMutating, requiresAuth, updateStatus, removeStatus, error } =
    useShowStatus(showId);

  const handlePress = (nextStatus: ShowStatus) => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }

    hapticSelection();
    void (async () => {
      try {
        await updateStatus(nextStatus);
      } catch {
        // Error rendered below.
      }
    })();
  };

  const showWentButton = Boolean(showDate && hasShowStarted(showDate) && status !== 'fui');

  const isShowDetail = appearance === 'showDetail';

  return (
    <ThemedView style={[styles.container, isShowDetail && styles.containerShowDetail]}>
      {!isShowDetail && requiresAuth ? (
        <ThemedText style={styles.authHint}>{t('events.statusRequiresAuth')}</ThemedText>
      ) : null}

      {!isShowDetail && !requiresAuth && status ? (
        <ThemedText style={styles.currentStatus}>
          {t('events.currentStatus', { status: t(`events.status.${status}`) })}
        </ThemedText>
      ) : null}

      <SegmentedControl
        disabled={isLoading || isMutating}
        options={[
          { value: 'interesado' as const, label: t('events.status.interesado') },
          { value: 'voy' as const, label: t('events.status.voy') },
          ...(showWentButton
            ? [{ value: 'fui' as const, label: t('events.status.fui') }]
            : []),
        ]}
        value={
          status === 'voy' || status === 'fui' || status === 'interesado'
            ? status
            : 'interesado'
        }
        onChange={(value) => handlePress(value)}
      />

      {!isShowDetail && !requiresAuth && status ? (
        <Button
          disabled={isLoading || isMutating}
          title={isLoading || isMutating ? t('common.loading') : t('events.removeFromMyShows')}
          variant="secondary"
          onPress={() => {
            void (async () => {
              try {
                await removeStatus();
              } catch {
                // Error rendered below.
              }
            })();
          }}
        />
      ) : null}

      {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  authHint: {
    fontSize: 13,
    opacity: 0.75,
    textAlign: 'center',
  },
  buttonRow: {
    gap: 10,
  },
  container: {
    gap: 10,
    marginTop: 8,
  },
  containerShowDetail: {
    marginTop: 0,
  },
  currentStatus: {
    color: '#2E9B4F',
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
});
