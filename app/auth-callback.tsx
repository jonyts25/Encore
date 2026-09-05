import { useURL } from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText } from '@/core/ui/Themed';
import { completeAuthFromUrl } from '@/modules/identity/authCallback';

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const url = useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    let mounted = true;

    void (async () => {
      const success = await completeAuthFromUrl(url);
      if (!mounted) return;

      if (success) {
        router.replace('/(tabs)/profile');
        return;
      }

      setError(t('identity.authCallbackFailed'));
    })();

    return () => {
      mounted = false;
    };
  }, [router, t, url]);

  return (
    <View style={styles.container}>
      {error ? (
        <ThemedText style={styles.error}>{error}</ThemedText>
      ) : (
        <>
          <ActivityIndicator size="large" />
          <ThemedText>{t('identity.authCallbackLoading')}</ThemedText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
});
