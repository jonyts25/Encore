import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';

export function ProfileScreenContent() {
  const { t } = useTranslation();
  const { isGuest, isOfflineSession, isLoading: sessionLoading, lastKnownUser, signOut } =
    useSession();
  const { profile, isLoading: profileLoading, error, role } = useProfile();

  if (sessionLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isGuest) {
    return null;
  }

  if (isOfflineSession) {
    return (
      <ThemedView style={styles.card}>
        <OfflineBanner visible />
        <ThemedText style={styles.label}>{t('identity.displayName')}</ThemedText>
        <ThemedText style={styles.value}>{lastKnownUser?.display_name ?? '—'}</ThemedText>
        {lastKnownUser?.email ? (
          <>
            <ThemedText style={styles.label}>{t('identity.email')}</ThemedText>
            <ThemedText style={styles.value}>{lastKnownUser.email}</ThemedText>
          </>
        ) : null}
      </ThemedView>
    );
  }

  if (profileLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.card}>
        <ThemedText style={styles.error}>{error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.label}>{t('identity.displayName')}</ThemedText>
      <ThemedText style={styles.value}>{profile?.display_name ?? '—'}</ThemedText>

      <ThemedText style={styles.label}>{t('identity.locale')}</ThemedText>
      <ThemedText style={styles.value}>{profile?.locale ?? '—'}</ThemedText>

      <ThemedText style={styles.label}>{t('identity.role')}</ThemedText>
      <ThemedText style={styles.value}>{role}</ThemedText>

      <Button
        title={t('identity.logout')}
        variant="secondary"
        onPress={() => {
          void signOut();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#D64545',
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});
