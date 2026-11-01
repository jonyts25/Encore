import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { useSession } from '@/modules/identity';

import { useArtistShowSections } from '../hooks/useArtistShowSections';
import type { Show } from '../types';
import { isShowActive } from '../visibility';
import { SHOW_DETAIL_SURFACE } from '../showDetailTheme';

import { ShowDetailDateBadge } from './ShowDetailDateBadge';

type ShowTourDatesSectionProps = {
  show: Show;
};

function collectTourShows(show: Show, sections: { yours: Show[]; other: Show[] }): Show[] {
  const pool = [...sections.yours, ...sections.other].filter(
    (candidate) => candidate.id !== show.id && isShowActive(candidate)
  );

  if (show.tour_id) {
    const onTour = pool.filter((candidate) => candidate.tour_id === show.tour_id);
    if (onTour.length > 0) {
      return onTour.sort(
        (a, b) => new Date(a.show_date).getTime() - new Date(b.show_date).getTime()
      );
    }
  }

  return pool.sort((a, b) => new Date(a.show_date).getTime() - new Date(b.show_date).getTime());
}

export function ShowTourDatesSection({ show }: ShowTourDatesSectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens, resolvedScheme } = useEncoreTheme();
  const { user } = useSession();
  const { sections, isLoading } = useArtistShowSections({
    artistId: show.artist_id,
    userId: user?.id ?? null,
  });

  const related = useMemo(() => collectTourShows(show, sections), [sections, show]);

  if (isLoading && related.length === 0) return null;
  if (related.length === 0) return null;

  const cardBg = resolvedScheme === 'dark' ? SHOW_DETAIL_SURFACE : tokens.surface;

  return (
    <View style={styles.wrap}>
      <Text style={[typography.title, { color: tokens.text }]}>{t('events.showDetail.moreTourDates')}</Text>
      <View style={[styles.list, { backgroundColor: cardBg }]}>
        {related.map((item, index) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => router.push(`/show/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              index < related.length - 1 && {
                borderBottomColor: tokens.separator,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
              pressed && styles.pressed,
            ]}>
            <ShowDetailDateBadge locale={i18n.language} showDate={item.show_date} size="small" />
            <View style={styles.rowText}>
              <Text numberOfLines={1} style={[typography.bodySemibold, { color: tokens.text }]}>
                {item.venue.city}
              </Text>
              <Text numberOfLines={1} style={[typography.footnote, { color: tokens.textSecondary }]}>
                {item.venue.name}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  wrap: {
    gap: 8,
  },
});
