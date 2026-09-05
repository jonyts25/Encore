import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText, ThemedView } from '@/core/ui/Themed';
import { formatShowVenueLine } from '@/modules/events/api';
import type { Show } from '@/modules/events/types';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';

type TodayShowCtaProps = {
  show: Show;
};

function isShowToday(showDate: string): boolean {
  const date = new Date(showDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function getTodayGoingShow(shows: Show[]): Show | null {
  return shows.find((show) => isShowToday(show.show_date)) ?? null;
}

export function TodayShowCta({ show }: TodayShowCtaProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { prediction } = useShowPrediction(show.id);

  const defaultTitle = prediction?.songs[0]?.title ?? '';
  const showLabel = `${show.artist.name} · ${show.venue.name}`;

  const openLive = () => {
    router.push({
      pathname: '/live',
      params: {
        artist: show.artist.name,
        title: defaultTitle,
        showId: show.id,
      },
    });
  };

  return (
    <ThemedView style={styles.card}>
      <ThemedText style={styles.kicker}>{t('home.todayShow.kicker')}</ThemedText>
      <ThemedText style={styles.title}>{t('home.todayShow.title', { show: showLabel })}</ThemedText>
      <ThemedText style={styles.subtitle}>{formatShowVenueLine(show.venue)}</ThemedText>
      <Button title={t('home.todayShow.openLive')} onPress={openLive} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    gap: 8,
    marginBottom: 20,
    padding: 16,
  },
  kicker: {
    color: '#ffe566',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#d4d4d4',
    fontSize: 14,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
