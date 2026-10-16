import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Card, PillButton, SectionHeader, StatusPill } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';

import { formatShowDate } from '../api';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import { useHomeShowSections } from '../hooks/useHomeShowSections';
import { useShowStatus } from '../hooks/useShowStatus';
import type { Show } from '../types';
import { AttendancePromptCard } from './AttendancePromptCard';
import { HomeHeroShowCard } from './HomeHeroShowCard';
import { getTodayGoingShow } from './TodayShowCta';

const TAB_BAR_CLEARANCE = 56;

function hasAnyShows(sections: {
  going: unknown[];
  goingAttendancePending: unknown[];
  interested: unknown[];
  forYou: unknown[];
  attended: unknown[];
}): boolean {
  return (
    sections.going.length > 0 ||
    sections.goingAttendancePending.length > 0 ||
    sections.interested.length > 0 ||
    sections.forYou.length > 0 ||
    sections.attended.length > 0
  );
}

function AttendancePromptItem({ show }: { show: Show }) {
  const { updateStatus, removeStatus, isMutating } = useShowStatus(show.id);

  return (
    <AttendancePromptCard
      show={show}
      isBusy={isMutating}
      onConfirmAttended={() => {
        void updateStatus('fui');
      }}
      onDeclineAttended={() => {
        void removeStatus();
      }}
    />
  );
}

function pickHeroShow(going: Show[]): Show | null {
  if (going.length === 0) return null;
  return [...going].sort(
    (a, b) => new Date(a.show_date).getTime() - new Date(b.show_date).getTime()
  )[0];
}

function UpcomingCarouselItem({ show }: { show: Show }) {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { tokens } = useEncoreTheme();

  return (
    <Pressable style={styles.carouselItem} onPress={() => router.push(`/show/${show.id}`)}>
      <Image
        contentFit="cover"
        source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
        style={styles.carouselImage}
      />
      <Text style={[typography.bodySemibold, { color: tokens.text }]}>{show.artist.name}</Text>
      <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
        {formatShowDate(show.show_date, i18n.language)} · {show.venue.name}
      </Text>
    </Pressable>
  );
}

export function HomeShowsContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { isGuest, session, user, isLoading: sessionLoading } = useSession();

  const { sections, isLoading, error, refetch, isOffline, isFetching } = useHomeShowSections({
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading && !isGuest,
  });

  if (sessionLoading) {
    return (
      <ThemedView style={styles.centeredFull}>
        <ThemedText>{t('common.loading')}</ThemedText>
      </ThemedView>
    );
  }

  if (isGuest) {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.title}>{t('home.title')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>
          <ThemedView style={styles.guestCard}>
            <ThemedText style={styles.guestTitle}>{t('home.guestTitle')}</ThemedText>
            <ThemedText style={styles.guestSubtitle}>{t('home.guestSubtitle')}</ThemedText>
            <Button title={t('home.goToProfile')} onPress={() => router.push('/(tabs)/profile')} />
          </ThemedView>
        </ThemedView>
      </ScrollView>
    );
  }

  const todayShow = getTodayGoingShow(sections.going);
  const { prediction: todayPrediction } = useShowPrediction(todayShow?.id ?? '', {
    enabled: Boolean(todayShow?.id),
  });
  const heroShow = pickHeroShow(sections.going);
  const hasData = hasAnyShows(sections);
  const carouselShows = sections.going.filter((show) => show.id !== heroShow?.id).slice(0, 8);

  const openLiveForShow = (show: Show) => {
    const defaultTitle =
      show.id === todayShow?.id ? (todayPrediction?.songs[0]?.title ?? '') : '';
    router.push({
      pathname: '/live',
      params: {
        artist: show.artist.name,
        showId: show.id,
        title: defaultTitle,
      },
    });
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: tokens.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }>
      <View style={styles.container}>
        <Text style={[typography.footnoteSemibold, { color: tokens.textSecondary }]}>
          {new Intl.DateTimeFormat(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(new Date())}
        </Text>
        <Text style={[typography.largeTitle, { color: tokens.text }]}>{t('home.hero.pageTitle')}</Text>

        {isOffline && hasData ? (
          <StatusPill label={t('offline.banner')} />
        ) : null}

        {isLoading ? <Text style={{ color: tokens.textSecondary }}>{t('common.loading')}</Text> : null}
        {!isLoading && error ? (
          <Card>
            <Text style={{ color: tokens.textSecondary }}>{error}</Text>
            <PillButton title={t('explore.retry')} variant="secondary" onPress={() => void refetch()} />
          </Card>
        ) : null}

        {!isLoading && !error && heroShow ? (
          <HomeHeroShowCard
            show={heroShow}
            statusLabel={t('home.hero.nextShowKicker')}
            onOpenLive={todayShow?.id === heroShow.id ? () => openLiveForShow(heroShow) : undefined}
          />
        ) : null}

        {!isLoading && !error && sections.goingAttendancePending.length > 0
          ? sections.goingAttendancePending.map((show) => (
              <AttendancePromptItem key={show.id} show={show} />
            ))
          : null}

        {!isLoading && !error && carouselShows.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              actionLabel={t('home.hero.seeAll')}
              title={t('home.hero.upcoming')}
              onActionPress={() => router.push('/explore')}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
              {carouselShows.map((show) => (
                <UpcomingCarouselItem key={show.id} show={show} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!isLoading && !error && !hasData ? (
          <Card>
            <Text style={[typography.bodySemibold, { color: tokens.text }]}>
              {t('home.sections.goingEmpty')}
            </Text>
            <PillButton
              title={t('home.hero.exploreShows')}
              onPress={() => router.push('/explore')}
            />
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  centeredFull: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  carousel: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  carouselImage: {
    backgroundColor: '#222',
    borderRadius: 18,
    height: 120,
    width: 164,
  },
  carouselItem: {
    gap: spacing.xs,
    width: 164,
  },
  container: {
    gap: spacing.xl,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.md,
  },
  error: {
    color: '#D64545',
    textAlign: 'center',
  },
  guestCard: {
    gap: 12,
    marginTop: 24,
  },
  guestSubtitle: {
    lineHeight: 22,
    opacity: 0.75,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollView: {
    flex: 1,
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
