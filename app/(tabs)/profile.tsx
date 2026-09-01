import { ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { AuthForm } from '@/modules/identity/components/AuthForm';
import { ProfileScreenContent } from '@/modules/identity/components/ProfileScreenContent';
import { useSession } from '@/modules/identity';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isGuest } = useSession();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t('identity.profileTitle')}</ThemedText>

        {isGuest ? (
          <>
            <ThemedText style={styles.guestHint}>{t('identity.guestHint')}</ThemedText>
            <AuthForm />
          </>
        ) : (
          <ProfileScreenContent />
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    padding: 24,
  },
  guestHint: {
    opacity: 0.8,
  },
  scroll: {
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
