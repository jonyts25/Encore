import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { SetlistPredictionPanel } from '@/modules/setlist';

import { fetchShowById, formatShowDate, formatShowVenueLine } from '../api';
import { ShowStatusButtons } from './ShowStatusButtons';
import type { Show } from '../types';

type ShowDetailContentProps = {
  showId: string;
};

export function ShowDetailContent({ showId }: ShowDetailContentProps) {
  const { t, i18n } = useTranslation();
  const [show, setShow] = useState<Show | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchShowById(showId);
      if (!data) {
        setError(t('events.showNotFound'));
        setShow(null);
        return;
      }
      setShow(data);
    } catch (err) {
      setShow(null);
      setError(err instanceof Error ? err.message : t('events.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [showId, t]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <ScrollView contentContainerStyle={styles.scroll}>
      <ThemedView style={styles.container}>
        {show.artist.image_url ? (
          <Image source={{ uri: show.artist.image_url }} style={styles.heroImage} />
        ) : (
          <ThemedView style={styles.heroPlaceholder}>
            <ThemedText style={styles.heroInitial}>{show.artist.name.charAt(0)}</ThemedText>
          </ThemedView>
        )}

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
        <ShowStatusButtons showId={show.id} />
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
});
