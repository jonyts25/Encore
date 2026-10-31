import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { StatusPill } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';
import type { Show, ShowStatus } from '@/modules/events/types';

import { showDateParts, upcomingStatusLabelKey } from '../artistPageLogic';

type ArtistConcertRowProps = {
  show: Show;
  userStatus?: ShowStatus | null;
  rating?: number | null;
};

export function ArtistConcertRow({ show, userStatus = null, rating = null }: ArtistConcertRowProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { day, month } = showDateParts(show.show_date, i18n.language);
  const statusKey = upcomingStatusLabelKey(userStatus ?? null);

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderColor: tokens.separator },
        pressed && styles.pressed,
      ]}
      onPress={() => router.push(`/show/${show.id}`)}>
      <View style={styles.dateBox}>
        <Text style={[styles.dateMonth, { color: tokens.accent }]}>{month}</Text>
        <Text style={[typography.title, styles.dateDay, { color: tokens.text }]}>{day}</Text>
      </View>
      <View style={styles.main}>
        <Text numberOfLines={2} style={[typography.bodySemibold, { color: tokens.text }]}>
          {show.venue.name}
        </Text>
        <Text numberOfLines={1} style={[typography.footnote, { color: tokens.textSecondary }]}>
          {show.venue.city}
        </Text>
        {rating != null && rating > 0 ? (
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Ionicons
                key={value}
                color={value <= rating ? tokens.accent : tokens.textSecondary}
                name={value <= rating ? 'star' : 'star-outline'}
                size={14}
              />
            ))}
          </View>
        ) : null}
      </View>
      {statusKey ? (
        <StatusPill label={t(statusKey)} tone="accent" />
      ) : (
        <Ionicons color={tokens.tabIconDefault} name="chevron-forward" size={18} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dateBox: {
    alignItems: 'center',
    minWidth: 48,
  },
  dateDay: {
    fontSize: 26,
    lineHeight: 28,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
});
