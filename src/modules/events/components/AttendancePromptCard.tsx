import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { formatShowVenueLine } from '../api';
import type { Show } from '../types';

type AttendancePromptCardProps = {
  show: Show;
  onConfirmAttended: () => void;
  onDeclineAttended: () => void;
  isBusy?: boolean;
};

export function AttendancePromptCard({
  show,
  onConfirmAttended,
  onDeclineAttended,
  isBusy = false,
}: AttendancePromptCardProps) {
  const { t } = useTranslation();
  const showLabel = `${show.artist.name} · ${show.venue.name}`;

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.title}>
        {t('home.attendance.title', { artist: show.artist.name })}
      </ThemedText>
      <ThemedText style={styles.subtitle}>{showLabel}</ThemedText>
      <ThemedText style={styles.venue}>{formatShowVenueLine(show.venue)}</ThemedText>
      <ThemedView style={styles.actions}>
        <Button
          disabled={isBusy}
          title={t('home.attendance.yes')}
          onPress={onConfirmAttended}
        />
        <Button
          disabled={isBusy}
          title={t('home.attendance.no')}
          variant="secondary"
          onPress={onDeclineAttended}
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(120, 120, 120, 0.12)',
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
    padding: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.75,
    textTransform: 'uppercase',
  },
  venue: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.75,
  },
});
