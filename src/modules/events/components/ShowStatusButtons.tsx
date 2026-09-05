import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowStatus } from '../hooks/useShowStatus';
import type { ShowStatus } from '../types';

type ShowStatusButtonsProps = {
  showId: string;
};

export function ShowStatusButtons({ showId }: ShowStatusButtonsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, isLoading, isMutating, requiresAuth, updateStatus, removeStatus, error } =
    useShowStatus(showId);

  const handlePress = (nextStatus: ShowStatus) => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }

    void (async () => {
      try {
        await updateStatus(nextStatus);
      } catch {
        // Error rendered below.
      }
    })();
  };

  return (
    <ThemedView style={styles.container}>
      {requiresAuth ? (
        <ThemedText style={styles.authHint}>{t('events.statusRequiresAuth')}</ThemedText>
      ) : null}

      {!requiresAuth && status ? (
        <ThemedText style={styles.currentStatus}>
          {t('events.currentStatus', { status: t(`events.status.${status}`) })}
        </ThemedText>
      ) : null}

      <ThemedView style={styles.buttonRow}>
        <Button
          disabled={isLoading || isMutating}
          title={isLoading || isMutating ? t('common.loading') : t('events.status.interesado')}
          variant={status === 'interesado' ? 'primary' : 'secondary'}
          onPress={() => handlePress('interesado')}
        />
        <Button
          disabled={isLoading || isMutating}
          title={isLoading || isMutating ? t('common.loading') : t('events.status.voy')}
          variant={status === 'voy' ? 'primary' : 'secondary'}
          onPress={() => handlePress('voy')}
        />
      </ThemedView>

      {!requiresAuth && status ? (
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
