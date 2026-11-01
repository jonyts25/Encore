import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import {
  Linking as RNLinking,
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
import { useQueryClient } from '@tanstack/react-query';
import { useIsOffline } from '@/core/network/useIsOffline';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { GlassIconButton, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { ThemedText, ThemedView } from '@/core/ui/Themed';
import { CommunityPlaylistsSection } from '@/modules/communityPlaylists/components/CommunityPlaylistsSection';
import {
  getSetlistPredictionMetaLine,
  SetlistPredictionPanel,
  useShowPrediction,
} from '@/modules/setlist';
import type { SetlistPredictionStructure } from '@/modules/setlist/types';

import { formatShowDate } from '../api';
import { formatShowVenueDateDisplay } from '../showVenueTime';
import { useShowPackStatus } from '../hooks/useShowPackStatus';
import { useShowEnrichIfNeeded } from '../hooks/useShowEnrichIfNeeded';
import { useShow } from '../hooks/useShow';
import { prefetchShowPack } from '../showPack';
import { isShowPackSetlistLyricsComplete } from '../showPackLogic';
import { hasConfirmedTime } from '../visibility';
import { useShowStatus } from '../hooks/useShowStatus';
import { buildAppleMapsUrl } from '../showDetailMaps';
import { SHOW_DETAIL_CANVAS, SHOW_DETAIL_PURPLE, SHOW_DETAIL_SURFACE } from '../showDetailTheme';

import { ShowNightSection } from './ShowNightSection';
import { ShowDetailDateBadge } from './ShowDetailDateBadge';
import { ShowDetailPhaseActions } from './ShowDetailPhaseActions';
import { ShowTourDatesSection } from './ShowTourDatesSection';

const CONFIDENCE_STRUCTURES: SetlistPredictionStructure[] = [
  'mostly_fixed',
  'rotating',
  'no_tour_data_fallback',
];

const HEADER_BLUR = 40;
const HEADER_DARKEN = 0.55;

type ShowDetailContentProps = {
  showId: string;
};

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
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { tokens, resolvedScheme } = useEncoreTheme();
  const isOffline = useIsOffline();
  const { show, isLoading, error, refetch, isFetching } = useShow(showId);
  const { status: userShowStatus } = useShowStatus(showId);
  const { prediction } = useShowPrediction(showId);
  const { isEnriching } = useShowEnrichIfNeeded({ show, prediction });
  const {
    record: packRecord,
    label: packLabel,
    rotationProgressLine,
    missingTitlesLine,
    canRetry,
    retry,
    packUpdatedAt,
  } = useShowPackStatus(show, Boolean(show));

  const [fontsLoaded] = useFonts({
    'SpaceGrotesk-Bold': require('../../../../assets/fonts/SpaceGrotesk-Bold.ttf'),
  });

  const showConfidence = prediction
    ? CONFIDENCE_STRUCTURES.includes(prediction.structure)
    : false;
  const predictionMeta = prediction
    ? getSetlistPredictionMetaLine(prediction, t, showConfidence)
    : null;

  const tourSubtitle = show?.tour?.name?.trim() ?? null;

  useEffect(() => {
    if (!show || !prediction) return;
    void prefetchShowPack(show, queryClient);
  }, [prediction, queryClient, show]);

  const primarySongTitle = useMemo(() => {
    if (!prediction?.songs.length) return null;
    const sorted = sortSongsForPractice(prediction.songs, showConfidence);
    return sorted[0]?.title ?? null;
  }, [prediction, showConfidence]);

  const pageBackground =
    resolvedScheme === 'dark' ? SHOW_DETAIL_CANVAS : tokens.background;
  const infoCardBackground =
    resolvedScheme === 'dark' ? SHOW_DETAIL_SURFACE : tokens.surface;
  const headerFadeColor = pageBackground;

  const packCardTitle = packLabel;

  const packSubtitle = useMemo(() => {
    if (!packRecord || packRecord.status === 'idle') return null;
    const lines: string[] = [];
    if (rotationProgressLine) {
      lines.push(rotationProgressLine);
    }
    if (missingTitlesLine) {
      lines.push(missingTitlesLine);
    }
    if (packUpdatedAt > 0 && packRecord.lyricsCached > 0) {
      lines.push(
        t('events.packUpdated', {
          relative: formatRelativeUpdated(packUpdatedAt, t),
        })
      );
    }
    return lines.length > 0 ? lines.join('\n') : null;
  }, [missingTitlesLine, packRecord, packUpdatedAt, rotationProgressLine, t]);

  const handleShare = () => {
    if (!show) return;
    const link = Linking.createURL(`/show/${show.id}`);
    void Share.share({
      message: t('events.shareMessageWithLink', {
        artist: show.artist.name,
        date: formatShowDate(show.show_date, i18n.language),
        venue: show.venue.name,
        link,
      }),
    });
  };

  const openLive = () => {
    if (!show) return;
    router.push({
      pathname: '/live',
      params: {
        artist: show.artist.name,
        title: primarySongTitle ?? '',
        showId: show.id,
      },
    });
  };

  const openPracticeLyrics = () => {
    if (!show) return;
    if (primarySongTitle) {
      router.push({
        pathname: '/lyrics',
        params: { artist: show.artist.name, title: primarySongTitle, showId: show.id },
      });
      return;
    }
    router.push({
      pathname: '/lyrics',
      params: { artist: show.artist.name, showId: show.id },
    });
  };

  const openMaps = () => {
    if (!show) return;
    void RNLinking.openURL(buildAppleMapsUrl(show.venue));
  };

  const venueDateDisplay = show
    ? formatShowVenueDateDisplay(show, i18n.language, t)
    : null;

  const venueTimeLine =
    venueDateDisplay?.venueTimeLine ??
    (show && hasConfirmedTime(show.show_date) ? null : t('events.timeUnconfirmed'));

  if (isLoading && !show) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if ((error && !show) || !show) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ color: tokens.recording, textAlign: 'center' }}>
          {error ?? t('events.showNotFound')}
        </ThemedText>
      </ThemedView>
    );
  }

  const hasArtistImage = Boolean(show.artist.image_url);

  return (
    <View style={[styles.root, { backgroundColor: pageBackground }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
        }>
        <View style={styles.header}>
          {hasArtistImage ? (
            <Image
              blurRadius={HEADER_BLUR}
              contentFit="cover"
              source={{ uri: show.artist.image_url! }}
              style={styles.headerBackdrop}
            />
          ) : (
            <LinearGradient
              colors={[`${SHOW_DETAIL_PURPLE}40`, headerFadeColor]}
              style={styles.headerBackdrop}
            />
          )}
          <View style={[styles.headerDim, { opacity: HEADER_DARKEN }]} />
          <LinearGradient
            colors={['rgba(0,0,0,0)', headerFadeColor]}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.headerActions, { top: insets.top + 8 }]}>
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

          <View style={styles.headerCenter}>
            <View style={styles.avatarWrap}>
              <Image
                contentFit="cover"
                source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
                style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.22)' }]}
              />
              <ShowDetailDateBadge
                locale={i18n.language}
                showDate={show.show_date}
                style={styles.dateBadgeOnAvatar}
              />
            </View>
            <Text
              style={[
                styles.artistName,
                fontsLoaded ? { fontFamily: 'SpaceGrotesk-Bold' } : null,
                { color: '#FFFFFF' },
              ]}>
              {show.artist.name}
            </Text>
            {tourSubtitle ? (
              <Text style={[typography.secondary, styles.tourLine]}>{tourSubtitle}</Text>
            ) : null}
          </View>
        </View>

        <ShowDetailPhaseActions
          show={show}
          onOpenLive={openLive}
          onOpenLyrics={openPracticeLyrics}
        />

        <View style={styles.body}>
          <OfflineBanner visible={isOffline} />

          <View style={[styles.infoCard, { backgroundColor: infoCardBackground }]}>
            <View style={[styles.infoRow, { borderBottomColor: tokens.separator }]}>
              <View style={styles.infoTextBlock}>
                <Text style={[typography.body, { color: tokens.text }]}>
                  {venueDateDisplay?.calendarLine ?? formatShowDate(show.show_date, i18n.language)}
                </Text>
                <Text style={[typography.body, { color: tokens.textSecondary }]}>
                  {venueTimeLine}
                </Text>
                {venueDateDisplay?.deviceTimeHint ? (
                  <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
                    {venueDateDisplay.deviceTimeHint}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              accessibilityLabel={t('events.showDetail.openMaps')}
              accessibilityRole="button"
              onPress={openMaps}
              style={({ pressed }) => [
                styles.infoRow,
                styles.infoRowLast,
                pressed && styles.pressed,
              ]}>
              <View style={styles.infoTextBlock}>
                <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                  {show.venue.name}
                </Text>
                <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
                  {show.venue.city}
                </Text>
              </View>
              <Ionicons color={tokens.accent} name="map-outline" size={22} />
            </Pressable>
          </View>

          {userShowStatus === 'fui' ? (
            <>
              <ShowNightSection show={show} />
            </>
          ) : null}

          {packRecord && packRecord.status !== 'idle' ? (
            <View style={[styles.packCard, { backgroundColor: infoCardBackground }]}>
              <View style={[styles.packIcon, { backgroundColor: tokens.successMuted }]}>
                <Ionicons
                  color={tokens.success}
                  name={
                    isShowPackSetlistLyricsComplete(packRecord) ? 'checkmark' : 'cloud-download-outline'
                  }
                  size={18}
                />
              </View>
              <View style={styles.packText}>
                <Text style={[typography.bodySemibold, { color: tokens.text }]}>{packCardTitle}</Text>
                {packSubtitle ? (
                  <Text style={[typography.footnote, { color: tokens.textSecondary }]}>{packSubtitle}</Text>
                ) : null}
                {canRetry ? (
                  <PillButton
                    title={t('events.showPackRetry')}
                    variant="secondary"
                    onPress={retry}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.setlistHeader}>
            <Text style={[typography.title, { color: tokens.text }]}>{t('setlist.probableTitle')}</Text>
            {predictionMeta ? (
              <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{predictionMeta}</Text>
            ) : null}
          </View>

          <SetlistPredictionPanel
            artistId={show.artist_id}
            artistName={show.artist.name}
            includeCommunityPlaylists={false}
            isEnriching={isEnriching}
            showId={show.id}
            tourId={show.tour_id}
            variant="compact"
          />

          <CommunityPlaylistsSection artistId={show.artist_id} tourId={show.tour_id} />

          <ShowTourDatesSection show={show} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  artistName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 32,
    textAlign: 'center',
  },
  avatar: {
    backgroundColor: '#1B1024',
    borderRadius: 64,
    borderWidth: 2,
    height: 128,
    width: 128,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  dateBadgeOnAvatar: {
    bottom: -4,
    position: 'absolute',
    right: -8,
  },
  header: {
    minHeight: 340,
    overflow: 'hidden',
    paddingBottom: 20,
    position: 'relative',
    width: '100%',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 3,
  },
  headerBackdrop: {
    ...StyleSheet.absoluteFill,
    height: '100%',
    width: '100%',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 108,
    paddingHorizontal: 24,
    zIndex: 2,
  },
  headerDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    zIndex: 1,
  },
  infoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  infoRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 56,
    paddingVertical: 14,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoTextBlock: {
    flex: 1,
    gap: 4,
  },
  packCard: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  packIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  packText: {
    flex: 1,
    gap: 2,
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
  tourLine: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
});
