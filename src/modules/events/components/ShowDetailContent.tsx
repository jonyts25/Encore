import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { GlassIconButton, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import {
  getSetlistPredictionMetaLine,
  SetlistPredictionPanel,
  useShowPrediction,
} from '@/modules/setlist';
import type { SetlistPredictionStructure } from '@/modules/setlist/types';

import { formatShowDate } from '../api';
import { useShowPackStatus } from '../hooks/useShowPackStatus';
import { useShow } from '../hooks/useShow';
import { getShowPhase } from '../visibility';
import { ShowStatusButtons } from './ShowStatusButtons';

const CONFIDENCE_STRUCTURES: SetlistPredictionStructure[] = [
  'mostly_fixed',
  'rotating',
  'no_tour_data_fallback',
];

type ShowDetailContentProps = {
  showId: string;
};

// Hermes (iOS) does not implement Intl.RelativeTimeFormat, so build the text ourselves.
function formatRelativeUpdated(
  timestamp: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return t('events.relative.justNow');
  if (minutes < 60) return t('events.relative.minutesAgo', { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t('events.relative.hoursAgo', { count: hours });
  return t('events.relative.daysAgo', { count: Math.round(hours / 24) });
}

function sortSongsForPractice(
  songs: { title: string; confidence?: number | null; avg_position?: number | null }[],
  showConfidence: boolean
) {
  if (showConfidence) {
    return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  }
  return [...songs].sort((a, b) => (a.avg_position ?? 0) - (b.avg_position ?? 0));
}

export function ShowDetailContent({ showId }: ShowDetailContentProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const isOffline = useIsOffline();
  const { show, isLoading, error, refetch, isFetching } = useShow(showId);
  const { prediction } = useShowPrediction(showId);
  const { record: packRecord, label: packLabel, isPartial, retry } = useShowPackStatus(
    show,
    Boolean(show)
  );

  const showConfidence = prediction
    ? CONFIDENCE_STRUCTURES.includes(prediction.structure)
    : false;
  const predictionMeta = prediction
    ? getSetlistPredictionMetaLine(prediction, t, showConfidence)
    : null;

  const heroSubtitle = useMemo(() => {
    if (show?.artist.genres?.length) return show.artist.genres.join(' · ');
    return t('setlist.predictionSubtitle');
  }, [show?.artist.genres, t]);

  const primarySongTitle = useMemo(() => {
    if (!prediction?.songs.length) return null;
    const sorted = sortSongsForPractice(prediction.songs, showConfidence);
    return sorted[0]?.title ?? null;
  }, [prediction, showConfidence]);

  const phase = show ? getShowPhase(show.show_date) : 'upcoming';

  const packCardTitle = useMemo(() => {
    if (!packRecord || packRecord.status === 'idle') return null;
    if (packRecord.status === 'downloading') return t('offline.showPackDownloading');
    if (packRecord.status === 'partial') return t('offline.showPackPartial');
    return t('offline.showPackCardTitle');
  }, [packRecord, t]);

  const packSubtitle = useMemo(() => {
    if (!packRecord || packRecord.status === 'idle') return packLabel;
    const updated =
      packRecord.statusUpdatedAt > 0
        ? t('events.packUpdated', {
            relative: formatRelativeUpdated(packRecord.statusUpdatedAt, t),
          })
        : null;
    if (packRecord.status === 'ready' && packRecord.lyricsTotal > 0) {
      const lyricsLine = t('events.packLyricsProgress', {
        cached: packRecord.lyricsCached,
        total: packRecord.lyricsTotal,
      });
      return updated ? `${lyricsLine} · ${updated}` : lyricsLine;
    }
    if (packLabel && updated) return `${packLabel} · ${updated}`;
    return packLabel ?? updated;
  }, [packLabel, packRecord, i18n.language, t]);

  const handleShare = () => {
    if (!show) return;
    void Share.share({
      message: t('events.shareMessage', {
        artist: show.artist.name,
        date: formatShowDate(show.show_date, i18n.language),
        venue: show.venue.name,
      }),
    });
  };

  const handleFab = () => {
    if (!show) return;
    if (phase === 'today') {
      router.push({
        pathname: '/live',
        params: {
          artist: show.artist.name,
          title: primarySongTitle ?? '',
          showId: show.id,
        },
      });
      return;
    }
    if (primarySongTitle) {
      router.push({
        pathname: '/lyrics',
        params: { artist: show.artist.name, title: primarySongTitle, showId: show.id },
      });
      return;
    }
    router.push(`/show/${show.id}`);
  };

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

  const fabTitle = phase === 'today' ? t('events.openLiveFab') : t('events.practiceLyrics');

  return (
    <View style={[styles.root, { backgroundColor: tokens.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
        }>
        <View style={styles.hero}>
          <Image
            contentFit="cover"
            source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.heroActions, { top: insets.top + 8 }]}>
            <GlassIconButton
              accessibilityLabel={t('live.back')}
              icon="chevron-back"
              onPress={() => router.back()}
            />
            <GlassIconButton
              accessibilityLabel={t('events.shareShow')}
              icon="share-outline"
              onPress={handleShare}
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroArtist}>{show.artist.name}</Text>
            <Text style={styles.heroTour}>{heroSubtitle}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <OfflineBanner visible={isOffline} />

          <View style={[styles.infoCard, { backgroundColor: tokens.surface }]}>
            <View style={[styles.infoRow, { borderBottomColor: tokens.separator }]}>
              <Ionicons color={tokens.accent} name="calendar-outline" size={20} />
              <Text style={[styles.infoText, { color: tokens.text }]}>
                {formatShowDate(show.show_date, i18n.language)}
              </Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowLast]}>
              <Ionicons color={tokens.accent} name="location-outline" size={20} />
              <Text numberOfLines={2} style={[styles.infoText, styles.infoVenue, { color: tokens.text }]}>
                {show.venue.name}
              </Text>
              <Ionicons color={tokens.tabIconDefault} name="chevron-forward" size={16} />
            </View>
          </View>

          <ShowStatusButtons appearance="showDetail" showDate={show.show_date} showId={show.id} />

          {packRecord && packRecord.status !== 'idle' ? (
            <Pressable
              accessibilityRole="button"
              disabled={!isPartial}
              onPress={isPartial ? retry : undefined}
              style={({ pressed }) => [
                styles.packCard,
                { backgroundColor: tokens.surface },
                pressed && isPartial && styles.pressed,
              ]}>
              <View style={[styles.packIcon, { backgroundColor: tokens.fillMuted }]}>
                <Ionicons color={tokens.success} name="checkmark" size={18} />
              </View>
              <View style={styles.packText}>
                <Text style={[styles.packTitle, { color: tokens.text }]}>{packCardTitle}</Text>
                {packSubtitle ? (
                  <Text style={[styles.packSubtitle, { color: tokens.textSecondary }]}>{packSubtitle}</Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}

          <View style={styles.setlistHeader}>
            <Text style={[styles.setlistTitle, { color: tokens.text }]}>{t('setlist.probableTitle')}</Text>
            {predictionMeta ? (
              <Text style={[styles.setlistMeta, { color: tokens.textSecondary }]}>{predictionMeta}</Text>
            ) : null}
          </View>

          <SetlistPredictionPanel artistName={show.artist.name} showId={show.id} variant="compact" />
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.fabWrap, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={[`${tokens.background}00`, `${tokens.background}E6`]}
          style={styles.fabGradient}
        />
        <PillButton style={styles.fabButton} title={fabTitle} onPress={handleFab} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  fabButton: {
    marginHorizontal: 20,
  },
  fabGradient: {
    ...StyleSheet.absoluteFill,
  },
  fabWrap: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  hero: {
    height: 300,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  heroActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 2,
  },
  heroArtist: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#1B1024',
  },
  heroText: {
    bottom: 18,
    left: 20,
    position: 'absolute',
    right: 20,
  },
  heroTour: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  infoRow: {
    alignItems: 'center',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    minHeight: 54,
    paddingVertical: 12,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoText: {
    color: '#111114',
    flex: 1,
    fontSize: 16,
  },
  infoVenue: {
    flex: 1,
  },
  packCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  packIcon: {
    alignItems: 'center',
    backgroundColor: '#E3F4E6',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  packSubtitle: {
    color: '#5E5E63',
    fontSize: 13,
  },
  packText: {
    flex: 1,
    gap: 2,
  },
  packTitle: {
    color: '#111114',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  setlistHeader: {
    gap: 2,
    marginTop: 4,
  },
  setlistMeta: {
    color: '#5E5E63',
    fontSize: 14,
  },
  setlistTitle: {
    color: '#111114',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
