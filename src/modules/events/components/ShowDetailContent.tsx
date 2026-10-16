import { RefreshControl, Image, ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { SetlistPredictionPanel } from '@/modules/setlist';

import { formatShowDate, formatShowVenueLine } from '../api';
import { useShow } from '../hooks/useShow';
import { ShowStatusButtons } from './ShowStatusButtons';

type ShowDetailContentProps = {
  showId: string;
};

export function ShowDetailContent({ showId }: ShowDetailContentProps) {
  const { t, i18n } = useTranslation();
  const isOffline = useIsOffline();
  const { show, isLoading, error, refetch, isFetching } = useShow(showId);

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (error || !show) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.error}>{error ?? t('events.showNotFound')}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }>
      <ThemedView style={styles.container}>
        <OfflineBanner visible={isOffline && Boolean(show)} />

        {show.artist.image_url ? (
          <Image source={{ uri: show.artist.image_url }} style={styles.heroImage} />
        ) : (
          <ThemedView style={styles.heroPlaceholder}>
            <ThemedText style={styles.heroInitial}>{show.artist.name.charAt(0)}</ThemedText>
          </ThemedView>
        )}

        {show.venue.photo_url ? (
          <Image source={{ uri: show.venue.photo_url }} style={styles.venueImage} />
        ) : null}

        <ThemedText style={styles.artist}>{show.artist.name}</ThemedText>
        <ThemedText style={styles.venue}>{formatShowVenueLine(show.venue)}</ThemedText>
        <ThemedText style={styles.date}>{formatShowDate(show.show_date, i18n.language)}</ThemedText>

        {show.artist.genres?.length ? (
          <>
            <ThemedText style={styles.sectionLabel}>{t('events.genres')}</ThemedText>
            <ThemedText style={styles.genres}>{show.artist.genres.join(' · ')}</ThemedText>
          </>
        ) : null}

        <SetlistPredictionPanel artistName={show.artist.name} showId={show.id} />

        <ThemedText style={styles.sectionLabel}>{t('events.yourStatus')}</ThemedText>
        <ShowStatusButtons showId={show.id} showDate={show.show_date} />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  artist: {
    fontSize: 32,
    fontWeight: '700',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    gap: 8,
    padding: 24,
  },
  date: {
    fontSize: 16,
    marginBottom: 8,
    opacity: 0.9,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  genres: {
    fontSize: 16,
    marginBottom: 8,
  },
  heroImage: {
    borderRadius: 16,
    height: 200,
    marginBottom: 8,
    width: '100%',
  },
  heroInitial: {
    fontSize: 64,
    fontWeight: '700',
  },
  heroPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8EEF8',
    borderRadius: 16,
    height: 200,
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  scroll: {
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  venue: {
    fontSize: 18,
    opacity: 0.8,
  },
  venueImage: {
    borderRadius: 12,
    height: 160,
    marginBottom: 8,
    width: '100%',
  },
});
