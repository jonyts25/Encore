import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { useShowPrediction } from '../hooks/useShowPrediction';
import {
  getPredictionDisclaimerKey,
  getPredictionDisclaimerParams,
  predictionShowsConfidence,
  sortPredictedSongsForDisplay,
} from '../predictionDisplay';
import type { SetlistPrediction } from '../types';

type SetlistPredictionPanelProps = {
  showId: string;
  artistName: string;
  variant?: 'default' | 'compact';
};

function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function SetlistPredictionPanel({
  showId,
  artistName,
  variant = 'default',
}: SetlistPredictionPanelProps) {
  const { t, i18n } = useTranslation();
  const { tokens } = useEncoreTheme();
  const locale = i18n.language;
  const router = useRouter();
  const { prediction, isLoading, error } = useShowPrediction(showId);

  const openLyrics = (title: string) => {
    router.push({
      pathname: '/lyrics',
      params: { artist: artistName, title, showId },
    });
  };

  const openLive = (title: string) => {
    router.push({
      pathname: '/live',
      params: { artist: artistName, title, showId },
    });
  };

  const showConfidence = prediction ? predictionShowsConfidence(prediction.structure) : false;
  const disclaimerKey = prediction ? getPredictionDisclaimerKey(prediction.structure) : null;
  const disclaimerParams = prediction ? getPredictionDisclaimerParams(prediction, locale) : undefined;
  const sortedSongs = prediction ? sortPredictedSongsForDisplay(prediction) : [];

  const isCompact = variant === 'compact';

  const metaLine =
    prediction && showConfidence && prediction.structure !== 'no_tour_data_fallback' ? (
      <>
        {t(`setlist.structure.${prediction.structure}`)} ·{' '}
        {t('setlist.sampleSize', { count: prediction.sample_size })}
      </>
    ) : prediction?.structure === 'no_tour_data_fallback' ? (
      t('setlist.sampleSize', { count: prediction.sample_size })
    ) : null;

  return (
    <ThemedView style={[styles.container, isCompact && styles.containerCompact]}>
      {!isCompact ? (
        <>
          <ThemedText style={styles.sectionLabel}>{t('setlist.predictionTitle')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('setlist.predictionSubtitle')}</ThemedText>
        </>
      ) : null}

      {isLoading ? <ThemedText>{t('common.loading')}</ThemedText> : null}

      {!isLoading && error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

      {!isLoading && !error && prediction?.structure === 'insufficient_data' ? (
        <ThemedText style={styles.empty}>{t('setlist.insufficientData')}</ThemedText>
      ) : null}

      {!isLoading && !error && prediction && prediction.songs.length > 0 ? (
        <>
          {!isCompact && disclaimerKey ? (
            <ThemedText style={styles.disclaimer}>
              {t(disclaimerKey, disclaimerParams)}
            </ThemedText>
          ) : null}

          {!isCompact && metaLine ? <ThemedText style={styles.meta}>{metaLine}</ThemedText> : null}

          <View
            style={[
              styles.list,
              isCompact && styles.listCompact,
              isCompact && { backgroundColor: tokens.surface },
            ]}>
            {sortedSongs.map((song, index) =>
              isCompact ? (
                <Pressable
                  key={song.song_id}
                  accessibilityRole="button"
                  onPress={() => openLyrics(song.title)}
                  style={({ pressed }) => [
                    styles.compactRow,
                    index < sortedSongs.length - 1 && {
                      borderBottomColor: tokens.separator,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && styles.compactRowPressed,
                  ]}>
                  <Text style={[styles.compactRank, { color: tokens.tabIconDefault }]}>{index + 1}</Text>
                  <Text numberOfLines={1} style={[styles.compactTitle, { color: tokens.text }]}>
                    {song.title}
                  </Text>
                  {showConfidence && song.confidence != null ? (
                    <Text style={[styles.compactPct, { color: tokens.textSecondary }]}>
                      {formatConfidence(song.confidence)}
                    </Text>
                  ) : null}
                </Pressable>
              ) : (
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
              )
            )}
          </View>
        </>
      ) : null}
    </ThemedView>
  );
}

export function getSetlistPredictionMetaLine(
  prediction: SetlistPrediction,
  t: (key: string, options?: Record<string, unknown>) => string,
  showConfidence: boolean
): string | null {
  if (showConfidence && prediction.structure !== 'no_tour_data_fallback') {
    return `${t(`setlist.structure.${prediction.structure}`)} · ${t('setlist.sampleSize', { count: prediction.sample_size })}`;
  }
  if (prediction.structure === 'no_tour_data_fallback') {
    return t('setlist.sampleSize', { count: prediction.sample_size });
  }
  return null;
}

const styles = StyleSheet.create({
  compactPct: {
    color: '#5E5E63',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  compactRank: {
    color: '#8E8E93',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    width: 22,
  },
  compactRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    height: 52,
    paddingHorizontal: 16,
  },
  compactRowBorder: {
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactRowPressed: {
    opacity: 0.7,
  },
  compactTitle: {
    color: '#111114',
    flex: 1,
    fontSize: 16,
  },
  confidence: {
    fontSize: 13,
    opacity: 0.7,
  },
  container: {
    gap: 8,
    marginTop: 8,
  },
  containerCompact: {
    marginTop: 0,
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
  listCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 0,
    marginTop: 0,
    overflow: 'hidden',
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
