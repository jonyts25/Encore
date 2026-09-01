import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { formatCountdownMessage, getCountdownState } from '../utils/countdown';

type ShowCountdownProps = {
  showDate: string;
};

export function ShowCountdown({ showDate }: ShowCountdownProps) {
  const { t } = useTranslation();
  const state = getCountdownState(showDate);
  const message = formatCountdownMessage(state, t);

  if (!message) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.label}>{t('prep.countdown.title')}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E8F5EC',
    borderRadius: 16,
    gap: 4,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 24,
    fontWeight: '700',
  },
});
