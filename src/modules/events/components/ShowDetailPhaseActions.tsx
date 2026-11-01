import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { GlassSegmentedControl, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { ThemedText } from '@/core/ui/Themed';
import { useShowMemory } from '@/modules/memory/hooks/useShowMemory';

import { useShowStatus } from '../hooks/useShowStatus';
import type { Show, ShowStatus } from '../types';
import { getShowPhase, hasConfirmedTime } from '../visibility';
import { SHOW_DETAIL_PURPLE } from '../showDetailTheme';

type ShowDetailPhaseActionsProps = {
  show: Show;
  onOpenLive: () => void;
  onOpenLyrics: () => void;
};

function formatStartTime(showDate: string, locale: string): string | null {
  if (!hasConfirmedTime(showDate)) return null;
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(showDate));
}

export function ShowDetailPhaseActions({
  show,
  onOpenLive,
  onOpenLyrics,
}: ShowDetailPhaseActionsProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const phase = getShowPhase(show);
  const { status, isLoading, isMutating, requiresAuth, updateStatus, removeStatus, error } =
    useShowStatus(show.id);
  const { memory } = useShowMemory(show.id, phase === 'past' && status === 'fui');
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);

  const todaySubtitle = useMemo(() => {
    if (phase !== 'today') return null;
    const time = formatStartTime(show.show_date, i18n.language);
    if (!time) return t('events.todayStatusUnconfirmed');
    return t('events.todayStatusSubtitle', { time });
  }, [i18n.language, phase, show.show_date, t]);

  const commitStatus = (nextStatus: ShowStatus) => {
    void (async () => {
      try {
        await updateStatus(nextStatus);
        if (nextStatus === 'fui') setAttendanceConfirmed(true);
      } catch {
        // Error rendered below.
      }
    })();
  };

  const handlePress = (nextStatus: ShowStatus) => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }
    hapticSelection();
    commitStatus(nextStatus);
  };

  const handleSegmentChange = (nextStatus: ShowStatus) => {
    if (requiresAuth) {
      router.push('/(tabs)/profile');
      return;
    }
    hapticSelection();
    if (status === nextStatus) {
      void removeStatus();
      return;
    }
    commitStatus(nextStatus);
  };

  const openShareNight = () => {
    router.push(`/show/${show.id}/share-night`);
  };

  const openSetlist = () => {
    router.push(`/show/${show.id}/setlist`);
  };

  const pillHalf = { flex: 1, minHeight: 48 };

  if (phase === 'past' && status !== 'fui' && !attendanceConfirmed) {
    return (
      <View style={styles.block}>
        <Text style={[typography.footnoteSemibold, { color: tokens.textSecondary, textAlign: 'center' }]}>
          {t('events.attendancePrompt')}
        </Text>
        <View style={styles.row}>
          <PillButton
            disabled={isLoading || isMutating}
            style={pillHalf}
            title={t('home.attendance.yes')}
            onPress={() => handlePress('fui')}
          />
          <PillButton
            disabled={isLoading || isMutating}
            style={pillHalf}
            title={t('home.attendance.no')}
            variant="glass"
            onPress={() => handlePress('no_fui')}
          />
        </View>
        {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
      </View>
    );
  }

  if (phase === 'past' && (status === 'fui' || attendanceConfirmed)) {
    const confirmed = Boolean(memory?.setlist_confirmed_at);
    const firstTitle = confirmed
      ? memory?.rating
        ? t('events.showDetail.ratingPill', { rating: memory.rating })
        : t('memory.summary.viewSetlist')
      : t('memory.summary.whatTheyPlayed');

    return (
      <View style={styles.block}>
        <View style={styles.row}>
          <PillButton style={pillHalf} title={firstTitle} variant="secondary" onPress={openSetlist} />
          <PillButton
            style={pillHalf}
            title={t('events.showDetail.shareNight')}
            variant="glass"
            onPress={openShareNight}
          />
        </View>
        {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
      </View>
    );
  }

  if (phase === 'today') {
    return (
      <View style={styles.block}>
        <View style={styles.row}>
          <PillButton
            icon="videocam"
            style={[pillHalf, { backgroundColor: SHOW_DETAIL_PURPLE }]}
            title={t('events.showDetail.liveMode')}
            onPress={onOpenLive}
          />
          <PillButton
            style={pillHalf}
            title={t('events.showDetail.lyricsShort')}
            variant="glass"
            onPress={onOpenLyrics}
          />
        </View>
        {todaySubtitle ? (
          <Text style={[typography.footnote, { color: tokens.textSecondary, textAlign: 'center' }]}>
            {todaySubtitle}
          </Text>
        ) : null}
        {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
      </View>
    );
  }

  const segmentedValue: ShowStatus | null =
    status === 'voy' || status === 'fui' || status === 'interesado' ? status : null;

  const options = [
    { value: 'interesado' as const, label: t('events.status.interesado'), icon: 'star' as const },
    { value: 'voy' as const, label: t('events.status.voy'), icon: 'ticket-outline' as const },
  ];

  const controlValue = segmentedValue === 'fui' ? null : segmentedValue;

  return (
    <View style={styles.block}>
      <GlassSegmentedControl
        disabled={isLoading || isMutating}
        options={options}
        segmentLayout="stacked"
        value={controlValue}
        onChange={(value) => handleSegmentChange(value)}
      />
      <PillButton
        title={t('events.practiceLyrics')}
        variant="glass"
        onPress={onOpenLyrics}
      />
      {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 8,
    paddingHorizontal: 20,
  },
  error: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
});
