import { ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { useUpcomingShows } from '../hooks/useUpcomingShows';
import { ShowListItem } from './ShowListItem';

export function UpcomingShowsContent() {
  const { t } = useTranslation();
  const { shows, isLoading, error } = useUpcomingShows();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t('events.upcomingTitle')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('events.upcomingSubtitle')}</ThemedText>

        {isLoading ? (
          <ThemedView style={styles.centered}>
            <ThemedText>{t('common.loading')}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && error ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.error}>{error}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && !error && shows.length === 0 ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyTitle}>{t('events.emptyTitle')}</ThemedText>
            <ThemedText style={styles.emptySubtitle}>{t('events.emptySubtitle')}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && !error && shows.length > 0 ? (
          <ThemedView style={styles.list}>
            {shows.map((show) => (
              <ShowListItem key={show.id} show={show} />
            ))}
          </ThemedView>
        ) : null}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptySubtitle: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  list: {
    marginTop: 12,
  },
  scroll: {
    flexGrow: 1,
  },
  subtitle: {
    marginTop: 4,
    opacity: 0.75,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
