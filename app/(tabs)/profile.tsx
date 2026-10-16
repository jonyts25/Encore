import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing } from '@/core/ui/theme';
import { AuthForm } from '@/modules/identity/components/AuthForm';
import { ProfileScreenContent } from '@/modules/identity/components/ProfileScreenContent';
import { useSession } from '@/modules/identity';
import { Card } from '@/core/ui';
import { ThemedText } from '@/core/ui/Themed';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isGuest } = useSession();
  const { tokens } = useEncoreTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('identity.profileTitle'),
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: tokens.background },
        }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { backgroundColor: tokens.background }]}>
        {isGuest ? (
          <Card style={styles.container}>
            <ThemedText style={styles.guestHint}>{t('identity.guestHint')}</ThemedText>
            <AuthForm />
          </Card>
        ) : (
          <ProfileScreenContent />
        )}
      </ScrollView>
    </>
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
