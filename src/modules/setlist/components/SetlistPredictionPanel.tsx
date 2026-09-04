import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowPrediction } from '../hooks/useShowPrediction';
import type { PredictedSong } from '../types';

type SetlistPredictionPanelProps = {
  showId: string;
  artistName: string;
};

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function sortByConfidence(songs: PredictedSong[]): PredictedSong[] {
  return [...songs].sort((a, b) => b.confidence - a.confidence);
}

export function SetlistPredictionPanel({ showId, artistName }: SetlistPredictionPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { prediction, isLoading, error } = useShowPrediction(showId);

  const openLyrics = (title: string) => {
    router.push({
      pathname: '/lyrics',
      params: { artist: artistName, title },
    });
  };

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
          <ThemedText style={styles.meta}>
            {t(`setlist.structure.${prediction.structure}`)} ·{' '}
            {t('setlist.sampleSize', { count: prediction.sample_size })}
          </ThemedText>
          <View style={styles.list}>
            {sortByConfidence(prediction.songs).map((song, index) => (
              <ThemedView key={song.song_id} style={styles.row}>
                <View style={styles.rowMain}>
                  <ThemedText style={styles.rank}>{index + 1}</ThemedText>
                  <View style={styles.rowText}>
                    <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
                    <ThemedText style={styles.confidence}>
                      {t('setlist.confidence', { pct: formatConfidence(song.confidence) })}
                    </ThemedText>
                  </View>
                </View>
                <Button
                  title={t('setlist.viewLyrics')}
                  variant="secondary"
                  onPress={() => openLyrics(song.title)}
                />
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
