import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { formatShowDate, formatShowVenueLine } from '../api';
import { useShowPackStatus } from '../hooks/useShowPackStatus';
import type { Show } from '../types';

type ShowListItemProps = {
  show: Show;
  showPackStatus?: boolean;
};

export function ShowListItem({ show, showPackStatus = false }: ShowListItemProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { label: packLabel } = useShowPackStatus(show.id, showPackStatus);

  return (
    <Pressable
      onPress={() => {
        router.push(`/show/${show.id}`);
      }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <ThemedView style={styles.body}>
        <ThemedText style={styles.artist}>{show.artist.name}</ThemedText>
        <ThemedText style={styles.venue}>{formatShowVenueLine(show.venue)}</ThemedText>
        <ThemedText style={styles.date}>{formatShowDate(show.show_date, i18n.language)}</ThemedText>
        {packLabel ? <ThemedText style={styles.pack}>{packLabel}</ThemedText> : null}
      </ThemedView>
      <ThemedText style={styles.chevron}>{t('events.viewDetail')}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  artist: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  chevron: {
    alignSelf: 'center',
    fontSize: 13,
    opacity: 0.6,
  },
  date: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  pack: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#E5E5E5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  rowPressed: {
    opacity: 0.75,
  },
  venue: {
    fontSize: 14,
    opacity: 0.75,
  },
});
