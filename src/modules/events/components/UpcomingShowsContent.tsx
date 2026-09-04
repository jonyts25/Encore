import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';

import { useUpcomingShows } from '../hooks/useUpcomingShows';
import { ShowListItem } from './ShowListItem';

type ShowsViewMode = 'followed' | 'all';

export function UpcomingShowsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isGuest, session, isLoading: sessionLoading } = useSession();
  const [viewMode, setViewMode] = useState<ShowsViewMode>('followed');

  const followedOnly = !isGuest && viewMode === 'followed';
  const { shows, isLoading, error } = useUpcomingShows({
    followedOnly,
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading,
  });

  const showFollowedEmpty = followedOnly && !isLoading && !error && shows.length === 0;
  const showGlobalEmpty = !followedOnly && !isLoading && !error && shows.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t('events.upcomingTitle')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {isGuest ? t('events.upcomingSubtitle') : t('events.upcomingSubtitleSignedIn')}
        </ThemedText>

        {!isGuest ? (
          <ThemedView style={styles.filterRow}>
            <Button
              title={t('events.filterFollowed')}
              variant={viewMode === 'followed' ? 'primary' : 'secondary'}
              onPress={() => setViewMode('followed')}
            />
            <Button
              title={t('events.filterAll')}
              variant={viewMode === 'all' ? 'primary' : 'secondary'}
              onPress={() => setViewMode('all')}
            />
          </ThemedView>
        ) : null}

        {isLoading || sessionLoading ? (
          <ThemedView style={styles.centered}>
            <ThemedText>{t('common.loading')}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && !sessionLoading && error ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.error}>{error}</ThemedText>
          </ThemedView>
        ) : null}

        {showFollowedEmpty ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyTitle}>{t('events.followedEmptyTitle')}</ThemedText>
            <ThemedText style={styles.emptySubtitle}>{t('events.followedEmptySubtitle')}</ThemedText>
            <Button
              title={t('events.goToCatalog')}
              variant="secondary"
              onPress={() => router.push('/(tabs)/catalog')}
            />
          </ThemedView>
        ) : null}

        {showGlobalEmpty ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.emptyTitle}>{t('events.emptyTitle')}</ThemedText>
            <ThemedText style={styles.emptySubtitle}>{t('events.emptySubtitle')}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && !sessionLoading && !error && shows.length > 0 ? (
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
    gap: 12,
    paddingVertical: 32,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptySubtitle: {
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
  filterRow: {
    gap: 10,
    marginTop: 12,
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
