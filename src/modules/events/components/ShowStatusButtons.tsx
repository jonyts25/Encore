import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { hapticSelection } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { GlassSegmentedControl, PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { ThemedText, ThemedView } from '@/core/ui/Themed';

import { getShowPhase, hasConfirmedTime, type ShowVisibilityInput } from '../visibility';
import { useShowStatus } from '../hooks/useShowStatus';
import type { ShowStatus } from '../types';

type ShowStatusButtonsProps = {
  showId: string;
  showDate?: string;
  show?: ShowVisibilityInput;
  appearance?: 'default' | 'showDetail';
};

function formatStartTime(showDate: string, locale: string): string | null {
  if (!hasConfirmedTime(showDate)) return null;
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(showDate));
}

export function ShowStatusButtons({
  showId,
  showDate,
  show,
  appearance = 'default',
}: ShowStatusButtonsProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { status, isLoading, isMutating, requiresAuth, updateStatus, removeStatus, error } =
    useShowStatus(showId);
  const [attendanceConfirmed, setAttendanceConfirmed] = useState(false);

  const visibilityShow =
    show ??
    (showDate
      ? {
          show_date: showDate,
          venue: { timezone: null } satisfies ShowVisibilityInput['venue'],
        }
      : null);
  const phase = visibilityShow ? getShowPhase(visibilityShow) : 'upcoming';

  const commitStatus = (nextStatus: ShowStatus) => {
    void (async () => {
      try {
        await updateStatus(nextStatus);
        if (nextStatus === 'fui') {
          setAttendanceConfirmed(true);
        }
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

  const todaySubtitle = useMemo(() => {
    if (phase !== 'today' || !showDate) return null;
    const time = formatStartTime(showDate, i18n.language);
    if (!time) return t('events.todayStatusUnconfirmed');
    return t('events.todayStatusSubtitle', { time });
  }, [i18n.language, phase, showDate, t]);

  const isShowDetail = appearance === 'showDetail';

  if (isShowDetail && phase === 'past' && status !== 'fui') {
    return (
      <View style={styles.showDetailBlock}>
        <Text style={[typography.footnoteSemibold, { color: tokens.textSecondary }]}>
          {t('events.attendancePrompt')}
        </Text>
        <View style={styles.pastActions}>
          <PillButton
            disabled={isLoading || isMutating}
            title={t('home.attendance.yes')}
            onPress={() => handlePress('fui')}
          />
          <PillButton
            disabled={isLoading || isMutating}
            title={t('home.attendance.no')}
            variant="glass"
            onPress={() => handlePress('no_fui')}
          />
        </View>
        {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
      </View>
    );
  }

  if (isShowDetail && (status === 'fui' || attendanceConfirmed)) {
    return (
      <Animated.View entering={ZoomIn.duration(220)} style={styles.confirmedRow}>
        <Ionicons color={tokens.success} name="checkmark-circle" size={22} />
        <Text style={[typography.bodySemibold, { color: tokens.text }]}>{t('events.status.fui')}</Text>
      </Animated.View>
    );
  }

  const segmentedValue: ShowStatus | null =
    status === 'voy' || status === 'fui' || status === 'interesado' ? status : null;

  const options =
    phase === 'upcoming' || phase === 'today'
      ? [
          { value: 'interesado' as const, label: t('events.status.interesado'), icon: 'star' as const },
          { value: 'voy' as const, label: t('events.status.voy'), icon: 'ticket-outline' as const },
        ]
      : [
          { value: 'interesado' as const, label: t('events.status.interesado'), icon: 'star' as const },
          { value: 'voy' as const, label: t('events.status.voy'), icon: 'ticket-outline' as const },
          { value: 'fui' as const, label: t('events.status.fui'), icon: 'sparkles-outline' as const },
        ];

  const controlValue =
    segmentedValue === 'fui' && phase !== 'past' ? null : segmentedValue;

  const control = (
    <GlassSegmentedControl
      disabled={isLoading || isMutating}
      options={options}
      value={controlValue}
      onChange={(value) => handleSegmentChange(value)}
    />
  );

  if (isShowDetail) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={styles.showDetailBlock}>
        {control}
        {phase === 'today' ? (
          <Text style={[typography.footnote, { color: tokens.textSecondary, textAlign: 'center' }]}>
            {todaySubtitle}
          </Text>
        ) : null}
        {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
      </Animated.View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {requiresAuth ? (
        <ThemedText style={styles.authHint}>{t('events.statusRequiresAuth')}</ThemedText>
      ) : null}

      {!requiresAuth && status ? (
        <ThemedText style={[styles.currentStatus, { color: tokens.success }]}>
          {t('events.currentStatus', { status: t(`events.status.${status}`) })}
        </ThemedText>
      ) : null}

      {control}

      {!requiresAuth && status ? (
        <PillButton
          disabled={isLoading || isMutating}
          title={isLoading || isMutating ? t('common.loading') : t('events.removeFromMyShows')}
          variant="glass"
          onPress={() => {
            void removeStatus();
          }}
        />
      ) : null}

      {error ? <ThemedText style={[styles.error, { color: tokens.recording }]}>{error}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  authHint: {
    fontSize: 13,
    opacity: 0.75,
    textAlign: 'center',
  },
  confirmedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 40,
  },
  container: {
    gap: 10,
    marginTop: 8,
  },
  currentStatus: {
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    textAlign: 'center',
  },
  pastActions: {
    flexDirection: 'row',
    gap: 10,
  },
  showDetailBlock: {
    gap: 8,
  },
});
