import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';

import { checkHealth } from '@/core/api';
import { getApiBaseUrl } from '@/core/api/config';
import { setLocale, useTranslation } from '@/core/i18n';
import type { SupportedLocale } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

type HealthState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; status: string }
  | { kind: 'error'; message: string };

export function HealthCheckPanel() {
  const { t, i18n } = useTranslation();
  const [health, setHealth] = useState<HealthState>({ kind: 'idle' });

  const handleCheck = useCallback(async () => {
    setHealth({ kind: 'loading' });
    try {
      const result = await checkHealth();
      setHealth({ kind: 'success', status: result.status });
    } catch {
      setHealth({ kind: 'error', message: t('home.apiError') });
    }
  }, [t]);

  const toggleLocale = useCallback(() => {
    const current = i18n.language.startsWith('en') ? 'en' : 'es';
    const next: SupportedLocale = current === 'es' ? 'en' : 'es';
    setLocale(next);
  }, [i18n.language]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t('home.title')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>

      <ThemedText style={styles.apiUrl}>{t('home.apiUrl', { url: getApiBaseUrl() })}</ThemedText>

      <Button
        title={health.kind === 'loading' ? t('home.checking') : t('home.checkApi')}
        disabled={health.kind === 'loading'}
        onPress={() => {
          void handleCheck();
        }}
      />

      {health.kind === 'success' ? (
        <ThemedText style={styles.success}>{t('home.apiOk', { status: health.status })}</ThemedText>
      ) : null}

      {health.kind === 'error' ? (
        <ThemedText style={styles.error}>{health.message}</ThemedText>
      ) : null}

      <ThemedView style={styles.languageRow}>
        <ThemedText>{t('settings.language')}:</ThemedText>
        <Button
          title={i18n.language.startsWith('en') ? t('settings.english') : t('settings.spanish')}
          variant="secondary"
          onPress={toggleLocale}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  apiUrl: {
    fontSize: 12,
    marginBottom: 24,
    opacity: 0.7,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  languageRow: {
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    opacity: 0.8,
    textAlign: 'center',
  },
  success: {
    color: '#2E9B4F',
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
});
