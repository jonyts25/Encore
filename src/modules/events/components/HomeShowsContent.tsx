import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { OfflineBanner } from '@/core/ui/OfflineBanner';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { useSession } from '@/modules/identity';

import { useHomeShowSections } from '../hooks/useHomeShowSections';
import { useShowStatus } from '../hooks/useShowStatus';
import type { Show } from '../types';
import { AttendancePromptCard } from './AttendancePromptCard';
import { ShowSection } from './ShowSection';
import { getTodayGoingShow, TodayShowCta } from './TodayShowCta';

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

export function HomeShowsContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const hasData = hasAnyShows(sections);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
      ]}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t('home.title')}</ThemedText>
        <ThemedText style={styles.subtitle}>{t('home.subtitle')}</ThemedText>

        <OfflineBanner visible={isOffline && hasData} />

        {!isLoading && !error && todayShow ? <TodayShowCta show={todayShow} /> : null}

        {!isLoading && !error && sections.goingAttendancePending.length > 0
          ? sections.goingAttendancePending.map((show) => (
              <AttendancePromptItem key={show.id} show={show} />
            ))
          : null}

        {isLoading ? (
          <ThemedView style={styles.centered}>
            <ThemedText>{t('common.loading')}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && error ? (
          <ThemedView style={styles.centered}>
            <ThemedText style={styles.error}>{error}</ThemedText>
          </ThemedView>
        ) : null}

        {!isLoading && !error ? (
          <>
            <ShowSection
              title={t('home.sections.going')}
              shows={sections.going}
              emptyMessage={t('home.sections.goingEmpty')}
              showPackStatus
            />
            <ShowSection
              title={t('home.sections.interested')}
              shows={sections.interested}
              emptyMessage={t('home.sections.interestedEmpty')}
            />
            <ShowSection
              title={t('home.sections.forYou')}
              shows={sections.forYou}
              emptyMessage={t('home.sections.forYouEmpty')}
            />
            <ShowSection
              title={t('home.sections.attended')}
              shows={sections.attended}
              emptyMessage={t('home.sections.attendedEmpty')}
            />
          </>
        ) : null}
      </ThemedView>
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
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
