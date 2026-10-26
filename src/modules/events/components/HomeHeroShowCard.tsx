import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton, StatusPill } from '@/core/ui';
import { spacing, typography } from '@/core/ui/theme';
import { formatShowDate, formatShowVenueLine } from '@/modules/events/api';
import type { Show } from '@/modules/events/types';
import { getShowPhase, isShowActive } from '@/modules/events/visibility';

import { useShowPackStatus } from '../hooks/useShowPackStatus';

type HomeHeroShowCardProps = {
  show: Show;
  statusLabel?: string;
  onOpenLive?: () => void;
};

function daysUntilShow(showDate: string): number {
  const showTime = new Date(showDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((showTime - now) / (1000 * 60 * 60 * 24)));
}

export function HomeHeroShowCard({ show, statusLabel, onOpenLive }: HomeHeroShowCardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const phase = getShowPhase(show.show_date);
  const showIsActive = isShowActive(show.show_date);
  const isConcertDay = showIsActive && phase === 'today';
  const { label: packLabel } = useShowPackStatus(show, true);

  const countdownLabel = isConcertDay
    ? t('home.hero.today', {
        time: formatShowDate(show.show_date, i18n.language),
      })
    : t('home.hero.inDays', { count: daysUntilShow(show.show_date) });

  return (
    <View style={styles.wrap}>
      <Image
        contentFit="cover"
        source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
        style={styles.image}
      />
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']} style={styles.gradient} />

      <View style={styles.topRow}>
        <StatusPill label={countdownLabel} />
        {packLabel ? <StatusPill label={packLabel} tone="success" /> : null}
      </View>

      <View style={styles.bottomBlock}>
        {statusLabel ? (
          <Text style={styles.kicker}>{statusLabel}</Text>
        ) : null}
        <Text style={styles.artist}>{show.artist.name}</Text>
        <Text style={styles.meta}>
          {formatShowDate(show.show_date, i18n.language)} · {formatShowVenueLine(show.venue)}
        </Text>
        <View style={styles.actions}>
          {isConcertDay && onOpenLive ? (
            <PillButton style={styles.actionButton} title={t('home.todayShow.openLive')} onPress={onOpenLive} />
          ) : (
            <PillButton
              style={styles.actionButton}
              title={t('home.hero.viewShow')}
              onPress={() => router.push(`/show/${show.id}`)}
            />
          )}
          <PillButton
            style={styles.actionButton}
            title={t('home.hero.setlist')}
            variant="glass"
            onPress={() => router.push(`/show/${show.id}`)}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  artist: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 42,
  },
  bottomBlock: {
    bottom: spacing.xl,
    left: spacing.xl,
    position: 'absolute',
    right: spacing.xl,
  },
  gradient: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#111',
  },
  kicker: {
    ...typography.captionUppercase,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xs,
  },
  meta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    marginTop: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
  },
  wrap: {
    borderRadius: 30,
    height: 392,
    overflow: 'hidden',
  },
});
