import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';
import { useArtistShowSections } from '@/modules/events';

import {
  buildArtistLiveStats,
  buildArtistUpcomingShows,
  formatArtistLastSeenMonthYear,
} from '../artistPageLogic';

import { ArtistConcertRow } from './ArtistConcertRow';

type ArtistShowsSectionProps = {
  artistId: string;
};

type ConcertSegment = 'upcoming' | 'attended';

export function ArtistShowsSection({ artistId }: ArtistShowsSectionProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { isGuest, user, isLoading: sessionLoading } = useSession();

  const { sections, isLoading, error } = useArtistShowSections({
    artistId,
    userId: user?.id ?? null,
    enabled: !sessionLoading,
  });

  const upcoming = useMemo(
    () => buildArtistUpcomingShows(sections.yours, sections.other),
    [sections.other, sections.yours]
  );
  const attended = sections.attended;
  const hasAttended = !isGuest && attended.length > 0;
  const [segment, setSegment] = useState<ConcertSegment>('upcoming');

  const liveStats = useMemo(() => buildArtistLiveStats(attended), [attended]);

  if ((sessionLoading || isLoading) && upcoming.length === 0 && attended.length === 0 && !error) {
    return (
      <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{t('common.loading')}</Text>
    );
  }

  if (error) {
    return <Text style={[typography.secondary, { color: tokens.recording }]}>{error}</Text>;
  }

  const activeSegment = segment === 'attended' && hasAttended ? 'attended' : 'upcoming';

  return (
    <View style={styles.block}>
      {liveStats ? (
        <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
          {liveStats.count === 1
            ? t('catalog.seenLive_one', {
                venue: liveStats.lastShow.venue.name,
                when: formatArtistLastSeenMonthYear(liveStats.lastShow.show_date, i18n.language),
              })
            : t('catalog.seenLive', {
                count: liveStats.count,
                venue: liveStats.lastShow.venue.name,
                when: formatArtistLastSeenMonthYear(liveStats.lastShow.show_date, i18n.language),
              })}
        </Text>
      ) : null}

      <Text style={[typography.title, { color: tokens.text }]}>{t('catalog.concertsTitle')}</Text>

      {hasAttended ? (
        <View style={styles.segmentRow}>
          <SegmentPill
            active={activeSegment === 'upcoming'}
            label={t('catalog.concertsUpcoming')}
            onPress={() => setSegment('upcoming')}
          />
          <SegmentPill
            active={activeSegment === 'attended'}
            label={t('catalog.concertsAttended')}
            onPress={() => setSegment('attended')}
          />
        </View>
      ) : null}

      {activeSegment === 'upcoming' ? (
        upcoming.length > 0 ? (
          <View>
            {upcoming.map((show) => (
              <ArtistConcertRow
                key={show.id}
                show={show}
                userStatus={sections.userStatusByShowId[show.id] ?? null}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBlock}>
            <Text style={[typography.body, { color: tokens.textSecondary }]}>
              {t('catalog.noUpcomingConcerts')}
            </Text>
            {!isGuest ? (
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  router.push({ pathname: '/add-show', params: { artistId } })
                }>
                <Text style={[typography.bodySemibold, { color: tokens.accent }]}>
                  {t('catalog.addConcertLink')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )
      ) : (
        <View>
          {[...attended]
            .sort((a, b) => new Date(b.show_date).getTime() - new Date(a.show_date).getTime())
            .map((show) => (
              <ArtistConcertRow
                key={show.id}
                rating={sections.ratingsByShowId[show.id] ?? null}
                show={show}
              />
            ))}
        </View>
      )}
    </View>
  );
}

function SegmentPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { tokens } = useEncoreTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentPill,
        {
          backgroundColor: active ? tokens.accent : tokens.surface,
          borderColor: tokens.separator,
        },
      ]}>
      <Text
        style={[
          typography.bodySemibold,
          { color: active ? tokens.onAccent : tokens.text },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  emptyBlock: {
    gap: spacing.sm,
  },
  segmentPill: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
