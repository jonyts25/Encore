import { ScrollView, StyleSheet } from 'react-native';

import { useEncoreTheme } from '@/core/ui/theme';
import { AuthForm } from '@/modules/identity/components/AuthForm';
import { ProfileScreenContent } from '@/modules/identity/components/ProfileScreenContent';
import { useSession } from '@/modules/identity';
import { Card } from '@/core/ui';
import { ThemedText } from '@/core/ui/Themed';
import { useTranslation } from '@/core/i18n';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isGuest } = useSession();
  const { tokens } = useEncoreTheme();

  if (isGuest) {
    return (
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: tokens.background }]}>
        <Card style={styles.container}>
          <ThemedText style={styles.guestHint}>{t('identity.guestHint')}</ThemedText>
          <AuthForm />
        </Card>
      </ScrollView>
    );
  }

  return <ProfileScreenContent />;
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    margin: 24,
    padding: 24,
  },
  guestHint: {
    opacity: 0.8,
  },
  scroll: {
    flexGrow: 1,
  },
});
