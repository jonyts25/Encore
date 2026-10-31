import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { CompactConcertMap } from '@/modules/events/components/CompactConcertMap';
import { filterAttendedShowsByYear } from '@/modules/events/myMapLogic';
import { filterDiscographyEntriesByYear } from '../discographyLogic';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';

import {
  computeDiscographyStats,
  groupDiscographyByMonth,
  listDiscographyYears,
} from '../discographyLogic';
import { useDiscography } from '../hooks/useDiscography';
import type { DiscographyYearFilter } from '../types';

import { DiscographyShowCard } from './DiscographyShowCard';

const TAB_BAR_CLEARANCE = 56;

function YearChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { tokens } = useEncoreTheme();
  return (
    <Pressable
      style={[
        styles.chip,
        {
          backgroundColor: selected ? tokens.accent : tokens.surface,
          borderColor: tokens.separator,
        },
      ]}
      onPress={onPress}>
      <Text
        style={[
          typography.footnoteSemibold,
          { color: selected ? tokens.onAccent : tokens.textSecondary },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatCell({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string | number;
  onPress?: () => void;
}) {
  const { tokens } = useEncoreTheme();
  const content = (
    <View style={styles.statCell}>
      <Text style={[typography.largeTitle, { color: tokens.text, fontSize: 26 }]}>{value}</Text>
      <Text style={[typography.footnote, { color: tokens.textSecondary, textAlign: 'center' }]}>
        {label}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" style={{ flex: 1 }} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={{ flex: 1 }}>{content}</View>;
}

export function DiscographyScreenContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { user, isGuest } = useSession();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<DiscographyYearFilter>(currentYear);

  const { entries, favoriteArtists, isLoading, error, refetch, isFetching } = useDiscography({
    userId: user?.id ?? null,
    enabled: Boolean(user),
  });

  const years = useMemo(() => listDiscographyYears(entries), [entries]);
  const favoriteIds = useMemo(() => favoriteArtists.map((a) => a.id), [favoriteArtists]);
  const stats = useMemo(
    () => computeDiscographyStats(entries, year, favoriteIds),
    [entries, favoriteIds, year]
  );

  const mapShows = useMemo(
    () => filterAttendedShowsByYear(entries.map((e) => e.show), year),
    [entries, year]
  );

  const monthGroups = useMemo(
    () => groupDiscographyByMonth(entries, year, i18n.language),
    [entries, i18n.language, year]
  );

  const seenFavoriteIds = useMemo(() => {
    const scopedIds = new Set(
      filterDiscographyEntriesByYear(entries, year).map((entry) => entry.show.artist_id)
    );
    return new Set(favoriteIds.filter((id) => scopedIds.has(id)));
  }, [entries, favoriteIds, year]);

  if (isGuest || !user) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={[typography.body, { color: tokens.textSecondary, textAlign: 'center' }]}>
          {t('discography.requiresAuth')}
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={{ color: tokens.textSecondary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={{ color: tokens.recording }}>{error}</Text>
      </View>
    );
  }

  const openSetlistPrompt = () => {
    if (stats.firstPendingSetlistShowId) {
      router.push(`/show/${stats.firstPendingSetlistShowId}`);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tokens.background }}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.sm,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        gap: spacing.lg,
      }}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }>
      <Text style={[typography.largeTitle, { color: tokens.text }]}>{t('discography.title')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <YearChip
          label={String(currentYear)}
          selected={year === currentYear}
          onPress={() => setYear(currentYear)}
        />
        {years
          .filter((y) => y !== currentYear)
          .map((y) => (
            <YearChip
              key={y}
              label={String(y)}
              selected={year === y}
              onPress={() => setYear(y)}
            />
          ))}
        <YearChip
          label={t('discography.yearAll')}
          selected={year === 'all'}
          onPress={() => setYear('all')}
        />
      </ScrollView>

      {stats.concerts === 0 ? (
        <View style={styles.emptyBlock}>
          <Text style={[typography.body, { color: tokens.textSecondary, textAlign: 'center' }]}>
            {t('discography.empty')}
          </Text>
          <PillButton
            title={t('discography.exploreCta')}
            variant="primary"
            onPress={() => router.push('/explore')}
          />
        </View>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCell label={t('discography.stats.concerts')} value={stats.concerts} />
            <StatCell label={t('discography.stats.artists')} value={stats.distinctArtists} />
            {stats.hasConfirmedSetlist ? (
              <StatCell label={t('discography.stats.liveSongs')} value={stats.liveSongs} />
            ) : (
              <StatCell
                label={t('discography.stats.confirmSetlists')}
                value="→"
                onPress={openSetlistPrompt}
              />
            )}
            <StatCell label={t('discography.stats.cities')} value={stats.cities} />
          </View>

          <CompactConcertMap shows={mapShows} onPress={() => router.push('/my-map')} />

          {favoriteArtists.length > 0 ? (
            <View style={styles.favoritesBlock}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                {t('discography.favoritesSeen', {
                  seen: stats.favoritesSeen,
                  total: stats.favoritesTotal,
                })}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.favoriteRow}>
                {favoriteArtists.map((artist) => {
                  const seen = seenFavoriteIds.has(artist.id);
                  return (
                    <View key={artist.id} style={styles.favoriteItem}>
                      <Image
                        contentFit="cover"
                        source={artist.imageUrl ? { uri: artist.imageUrl } : undefined}
                        style={[
                          styles.favoriteCircle,
                          {
                            backgroundColor: tokens.fillMuted,
                            opacity: seen ? 1 : 0.35,
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.timeline}>
            {monthGroups.map((group) => (
              <View key={group.monthKey} style={styles.monthBlock}>
                <Text style={[typography.title, { color: tokens.text }]}>{group.label}</Text>
                {group.entries.map((entry) => (
                  <DiscographyShowCard key={entry.show.id} entry={entry} locale={i18n.language} />
                ))}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  chip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipRow: {
    gap: spacing.sm,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  favoriteCircle: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  favoriteItem: {
    alignItems: 'center',
  },
  favoriteRow: {
    gap: spacing.sm,
  },
  favoritesBlock: {
    gap: spacing.sm,
  },
  monthBlock: {
    gap: spacing.sm,
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeline: {
    gap: spacing.lg,
  },
});
