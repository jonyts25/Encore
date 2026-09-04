import { StyleSheet } from 'react-native';

import { ThemedText, ThemedView } from '@/core/ui/Themed';

import type { Show } from '../types';
import { ShowListItem } from './ShowListItem';

type ShowSectionProps = {
  title: string;
  shows: Show[];
  emptyMessage?: string;
};

export function ShowSection({ title, shows, emptyMessage }: ShowSectionProps) {
  return (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      {shows.length > 0 ? (
        <ThemedView style={styles.list}>
          {shows.map((show) => (
            <ShowListItem key={show.id} show={show} />
          ))}
        </ThemedView>
      ) : emptyMessage ? (
        <ThemedText style={styles.empty}>{emptyMessage}</ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  list: {
    marginTop: 4,
  },
  section: {
    gap: 8,
    marginTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
