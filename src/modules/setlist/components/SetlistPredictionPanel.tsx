import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowPrediction } from '../hooks/useShowPrediction';
import type { PredictedSong, SetlistPrediction, SetlistPredictionStructure } from '../types';

type SetlistPredictionPanelProps = {
  showId: string;
  artistName: string;
};

const CONFIDENCE_STRUCTURES: SetlistPredictionStructure[] = [
  'mostly_fixed',
  'rotating',
  'no_tour_data_fallback',
];

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function sortByConfidence(songs: PredictedSong[]): PredictedSong[] {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

function sortBySetlistOrder(songs: PredictedSong[]): PredictedSong[] {
  return [...songs].sort((a, b) => (a.avg_position ?? 0) - (b.avg_position ?? 0));
}

function formatReferenceDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatReferenceDates(dates: string[], locale: string): string {
  return dates.map((date) => formatReferenceDate(date, locale)).join(', ');
}

function getDisclaimerKey(structure: SetlistPredictionStructure): string | null {
  if (structure === 'single_show_reference') return 'setlist.referenceSingleShow';
  if (structure === 'limited_tour_data') return 'setlist.referenceLimitedTour';
  if (structure === 'no_tour_data_fallback') return 'setlist.fallbackNoTour';
  return null;
}

function getDisclaimerParams(
  prediction: SetlistPrediction,
  locale: string
): Record<string, string> | undefined {
  const dates = prediction.reference_show_dates ?? [];
  if (prediction.structure === 'single_show_reference' && dates[0]) {
    return { date: formatReferenceDate(dates[0], locale) };
  }
  if (prediction.structure === 'limited_tour_data' && dates.length > 0) {
    return { dates: formatReferenceDates(dates, locale) };
  }
  return undefined;
}

export function SetlistPredictionPanel({ showId, artistName }: SetlistPredictionPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const router = useRouter();
  const { prediction, isLoading, error } = useShowPrediction(showId);

  const openLyrics = (title: string) => {
    router.push({
      pathname: '/lyrics',
      params: { artist: artistName, title },
    });
  };

  const openLive = (title: string) => {
    router.push({
      pathname: '/live',
      params: { artist: artistName, title },
    });
  };

  const showConfidence = prediction
    ? CONFIDENCE_STRUCTURES.includes(prediction.structure)
    : false;
  const disclaimerKey = prediction ? getDisclaimerKey(prediction.structure) : null;
  const disclaimerParams = prediction ? getDisclaimerParams(prediction, locale) : undefined;
  const sortedSongs =
    prediction && showConfidence
      ? sortByConfidence(prediction.songs)
      : prediction
        ? sortBySetlistOrder(prediction.songs)
        : [];

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.sectionLabel}>{t('setlist.predictionTitle')}</ThemedText>
      <ThemedText style={styles.subtitle}>{t('setlist.predictionSubtitle')}</ThemedText>

      {isLoading ? <ThemedText>{t('common.loading')}</ThemedText> : null}

      {!isLoading && error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      {!isLoading && !error && prediction?.structure === 'insufficient_data' ? (
        <ThemedText style={styles.empty}>{t('setlist.insufficientData')}</ThemedText>
      ) : null}

      {!isLoading && !error && prediction && prediction.songs.length > 0 ? (
        <>
          {disclaimerKey ? (
            <ThemedText style={styles.disclaimer}>
              {t(disclaimerKey, disclaimerParams)}
            </ThemedText>
          ) : null}

          {showConfidence && prediction.structure !== 'no_tour_data_fallback' ? (
            <ThemedText style={styles.meta}>
              {t(`setlist.structure.${prediction.structure}`)} ·{' '}
              {t('setlist.sampleSize', { count: prediction.sample_size })}
            </ThemedText>
          ) : null}

          {prediction.structure === 'no_tour_data_fallback' ? (
            <ThemedText style={styles.meta}>
              {t('setlist.sampleSize', { count: prediction.sample_size })}
            </ThemedText>
          ) : null}

          <View style={styles.list}>
            {sortedSongs.map((song, index) => (
              <ThemedView key={song.song_id} style={styles.row}>
                <View style={styles.rowMain}>
                  <ThemedText style={styles.rank}>{index + 1}</ThemedText>
                  <View style={styles.rowText}>
                    <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
                    {showConfidence && song.confidence != null ? (
                      <ThemedText style={styles.confidence}>
                        {t('setlist.confidence', { pct: formatConfidence(song.confidence) })}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <View style={styles.lyricsButtonWrap}>
                    <Button
                      title={t('setlist.viewLyrics')}
                      variant="secondary"
                      onPress={() => openLyrics(song.title)}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel={t('setlist.openLive')}
                    accessibilityRole="button"
                    onPress={() => openLive(song.title)}
                    style={({ pressed }) => [styles.liveButton, pressed && styles.liveButtonPressed]}>
                    <Text style={styles.liveIcon}>🎥</Text>
                  </Pressable>
                </View>
              </ThemedView>
            ))}
          </View>
        </>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  confidence: {
    fontSize: 13,
    opacity: 0.7,
  },
  container: {
    gap: 8,
    marginTop: 8,
  },
  disclaimer: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  empty: {
    opacity: 0.75,
  },
  error: {
    color: '#D64545',
  },
  list: {
    gap: 10,
    marginTop: 4,
  },
  liveButton: {
    alignItems: 'center',
    backgroundColor: '#ECECEC',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  liveButtonPressed: {
    opacity: 0.85,
  },
  liveIcon: {
    fontSize: 22,
  },
  lyricsButtonWrap: {
    flex: 1,
  },
  meta: {
    fontSize: 13,
    opacity: 0.7,
  },
  rank: {
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.5,
    width: 24,
  },
  row: {
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  rowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rowMain: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
});
