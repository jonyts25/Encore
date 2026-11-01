import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';

import { CommunityPlaylistsSection } from '@/modules/communityPlaylists/components/CommunityPlaylistsSection';
import { ListenSetlistButton } from '@/modules/music/components/ListenSetlistButton';
import { SongListenButton } from '@/modules/music/components/SongListenButton';

import { useShowPrediction } from '../hooks/useShowPrediction';
import {
  getPredictionDisclaimerKey,
  getPredictionDisclaimerParams,
  predictedSongConfidencePct,
  predictionShowsConfidence,
  sortPredictedSongsForDisplay,
} from '../predictionDisplay';
import type { PredictedSong, SetlistPrediction } from '../types';

type SetlistPredictionPanelProps = {
  showId: string;
  artistId: string;
  artistName: string;
  tourId: string | null;
  variant?: 'default' | 'compact';
  includeCommunityPlaylists?: boolean;
  isEnriching?: boolean;
};

type PredictionListItem =
  | { kind: 'encore-divider' }
  | { kind: 'song'; song: PredictedSong; rank: number };

function buildPredictionListItems(songs: PredictedSong[]): PredictionListItem[] {
  const items: PredictionListItem[] = [];
  let encoreDividerShown = false;
  let rank = 0;

  for (const song of songs) {
    if (song.is_encore && !encoreDividerShown) {
      items.push({ kind: 'encore-divider' });
      encoreDividerShown = true;
    }
    rank += 1;
    items.push({ kind: 'song', song, rank });
  }

  return items;
}

function formatSongPct(song: PredictedSong): string | null {
  const pct = predictedSongConfidencePct(song);
  return pct != null ? `${pct}%` : null;
}

export function SetlistPredictionPanel({
  showId,
  artistId,
  artistName,
  tourId,
  variant = 'default',
  includeCommunityPlaylists = true,
  isEnriching = false,
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
  const listItems = buildPredictionListItems(sortedSongs);
  const rotationSongs = prediction?.others ?? [];
  const [rotationExpanded, setRotationExpanded] = useState(false);

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

      {!isLoading &&
      !error &&
      isEnriching &&
      (prediction?.structure === 'insufficient_data' || (prediction?.songs.length ?? 0) === 0) ? (
        <View style={styles.enrichingRow}>
          <ActivityIndicator color={tokens.accent} size="small" />
          <ThemedText style={[styles.empty, { color: tokens.textSecondary }]}>
            {t('setlist.enrichingTourSetlists')}
          </ThemedText>
        </View>
      ) : null}

      {!isLoading &&
      !error &&
      !isEnriching &&
      prediction?.structure === 'insufficient_data' ? (
        <ThemedText style={styles.empty}>{t('setlist.insufficientData')}</ThemedText>
      ) : null}

      {!isLoading && prediction?.enrichment_notice === 'new_tour_from_recent_shows' ? (
        <ThemedText style={[styles.disclaimer, { color: tokens.textSecondary }]}>
          {t('setlist.newTourFromRecentShows')}
        </ThemedText>
      ) : null}

      <ListenSetlistButton artistId={artistId} artistName={artistName} tourId={tourId} />
      {includeCommunityPlaylists ? (
        <CommunityPlaylistsSection artistId={artistId} tourId={tourId} />
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
            {listItems.map((item, index) => {
              if (item.kind === 'encore-divider') {
                return (
                  <ThemedText key={`encore-${index}`} style={styles.encoreDivider}>
                    {t('memory.setlist.encoreDivider')}
                  </ThemedText>
                );
              }

              const { song, rank } = item;
              const pctLabel = formatSongPct(song);

              return isCompact ? (
                <Pressable
                  key={song.song_id}
                  accessibilityRole="button"
                  onPress={() => openLyrics(song.title)}
                  style={({ pressed }) => [
                    styles.compactRow,
                    index < listItems.length - 1 && {
                      borderBottomColor: tokens.separator,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && styles.compactRowPressed,
                  ]}>
                  <Text style={[styles.compactRank, { color: tokens.tabIconDefault }]}>{rank}</Text>
                  <Text numberOfLines={1} style={[styles.compactTitle, { color: tokens.text }]}>
                    {song.title}
                  </Text>
                  <SongListenButton artistName={artistName} songTitle={song.title} size={20} />
                  {pctLabel ? (
                    <Text style={[styles.compactPct, { color: tokens.textSecondary }]}>{pctLabel}</Text>
                  ) : null}
                </Pressable>
              ) : (
                <ThemedView key={song.song_id} style={styles.row}>
                  <View style={styles.rowMain}>
                    <ThemedText style={styles.rank}>{rank}</ThemedText>
                    <ThemedText style={styles.songTitle}>{song.title}</ThemedText>
                    {pctLabel ? <ThemedText style={styles.confidenceRight}>{pctLabel}</ThemedText> : null}
                  </View>
                  <View style={styles.rowActions}>
                    <View style={styles.lyricsButtonWrap}>
                      <Button
                        title={t('setlist.viewLyrics')}
                        variant="secondary"
                        onPress={() => openLyrics(song.title)}
                      />
                    </View>
                    <SongListenButton artistName={artistName} songTitle={song.title} />
                    <Pressable
                      accessibilityLabel={t('setlist.openLive')}
                      accessibilityRole="button"
                      onPress={() => openLive(song.title)}
                      style={({ pressed }) => [styles.liveButton, pressed && styles.liveButtonPressed]}>
                      <Text style={styles.liveIcon}>🎥</Text>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}
          </View>

          {!isCompact && rotationSongs.length > 0 ? (
            <View style={styles.rotationBlock}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setRotationExpanded((value) => !value)}
                style={({ pressed }) => [styles.rotationHeader, pressed && styles.rotationHeaderPressed]}>
                <ThemedText style={styles.rotationTitle}>{t('setlist.rotationSectionTitle')}</ThemedText>
                <ThemedText style={styles.rotationChevron}>{rotationExpanded ? '▾' : '▸'}</ThemedText>
              </Pressable>
              {rotationExpanded ? (
                <View style={styles.rotationList}>
                  {rotationSongs.map((song) => (
                    <View key={song.song_id} style={styles.rotationRow}>
                      <ThemedText style={styles.rotationSongTitle}>{song.title}</ThemedText>
                      <ThemedText style={styles.rotationPct}>
                        {t('setlist.rotationFrequency', {
                          pct: Math.round(song.frequency_pct),
                        })}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
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
  confidenceRight: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
    opacity: 0.7,
  },
  encoreDivider: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.75,
    paddingVertical: 4,
    textAlign: 'center',
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
  enrichingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
    textTransform: 'uppercase',
  },
  songTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.75,
  },
  rotationBlock: {
    gap: 6,
    marginTop: 8,
  },
  rotationChevron: {
    fontSize: 16,
    opacity: 0.6,
  },
  rotationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  rotationHeaderPressed: {
    opacity: 0.75,
  },
  rotationList: {
    gap: 8,
  },
  rotationPct: {
    fontSize: 13,
    opacity: 0.7,
  },
  rotationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  rotationSongTitle: {
    flex: 1,
    fontSize: 15,
  },
  rotationTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
