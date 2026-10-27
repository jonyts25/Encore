import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Card, PillButton, SectionHeader, StatusPill } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useArtistCatalogSearch } from '@/modules/catalog/hooks/useArtistCatalogSearch';
import { useSession } from '@/modules/identity';

import {
  artistsFromAttendedShows,
  buildVenueBuckets,
  collectExploreCities,
  exploreHasCityContent,
  filterShowsByCity,
  groupExploreSearch,
  pickDefaultExploreCity,
  showsThisWeekInCity,
  upcomingShowsInCitySorted,
  uniqueVenuesFromShows,
} from '../exploreLogic';
import { readExploreCityPreference, writeExploreCityPreference } from '../exploreCityPreference';
import { formatShowCardMetaParts } from '../showVenueTime';
import { useExplorePopularArtists } from '../hooks/useExplorePopularArtists';
import { useHomeShowSections } from '../hooks/useHomeShowSections';
import { useUpcomingShows } from '../hooks/useUpcomingShows';
import type { ExploreVenueBucket } from '../exploreLogic';
import type { Show } from '../types';
import { ShowPhotoCarouselCard } from './ShowPhotoCarouselCard';

const TAB_BAR_CLEARANCE = 72;
const HERO_IMAGE_HEIGHT = 220;

function weekdayPillLabel(showDate: string, locale: string): string {
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, { weekday: 'long' }).format(new Date(showDate));
}

function ExploreWeekCard({ show }: { show: Show }) {
  const router = useRouter();
  const { i18n } = useTranslation();

  return (
    <Pressable style={styles.weekCard} onPress={() => router.push(`/show/${show.id}`)}>
      <Image
        contentFit="cover"
        source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
        style={styles.weekImage}
      />
      <View style={styles.weekPillWrap}>
        <StatusPill label={weekdayPillLabel(show.show_date, i18n.language)} />
      </View>
      <View style={styles.weekText}>
        <Text style={[typography.bodySemibold, { color: '#FFF' }]} numberOfLines={1}>
          {show.artist.name}
        </Text>
        <Text style={[typography.footnote, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
          {show.venue.name}
        </Text>
      </View>
    </Pressable>
  );
}

function ExploreUpcomingRow({ show }: { show: Show }) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { tokens } = useEncoreTheme();
  const parts = formatShowCardMetaParts(show, i18n.language, t);
  const date = new Date(show.show_date);
  const month = new Intl.DateTimeFormat(i18n.language.startsWith('en') ? 'en-US' : 'es-MX', {
    month: 'short',
  })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  const day = String(date.getDate());

  return (
    <Pressable style={[styles.upcomingRow, { borderColor: tokens.separator }]} onPress={() => router.push(`/show/${show.id}`)}>
      <View style={styles.dateBox}>
        <Text style={[styles.dateMonth, { color: tokens.accent }]}>{month}</Text>
        <Text style={[typography.title, { color: tokens.text, fontSize: 26, lineHeight: 28 }]}>{day}</Text>
      </View>
      <Image
        contentFit="cover"
        source={show.artist.image_url ? { uri: show.artist.image_url } : undefined}
        style={styles.upcomingThumb}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.bodySemibold, { color: tokens.text }]} numberOfLines={1}>
          {show.artist.name}
        </Text>
        <Text style={[typography.footnote, { color: tokens.textSecondary }]} numberOfLines={1}>
          {parts.venueName}
        </Text>
      </View>
    </Pressable>
  );
}

function ArtistCircleRow({
  title,
  artists,
}: {
  title: string;
  artists: { id: string; name: string; image_url: string | null }[];
}) {
  const router = useRouter();
  const { tokens } = useEncoreTheme();

  if (artists.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRow}>
        {artists.map((artist) => (
          <Pressable key={artist.id} style={styles.artistCircleItem} onPress={() => router.push(`/artist/${artist.id}`)}>
            <Image
              contentFit="cover"
              source={artist.image_url ? { uri: artist.image_url } : undefined}
              style={[styles.artistCircle, { backgroundColor: tokens.fillMuted }]}
            />
            <Text style={[typography.footnote, { color: tokens.textSecondary }]} numberOfLines={1}>
              {artist.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function ExploreScreenContent() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { session, user, isLoading: sessionLoading } = useSession();

  const { shows, isLoading: showsLoading, refetch, isFetching } = useUpcomingShows({
    followedOnly: false,
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    enabled: !sessionLoading,
  });

  const { sections } = useHomeShowSections({
    userId: user?.id ?? null,
    accessToken: session?.access_token ?? null,
    enabled: Boolean(user) && !sessionLoading,
  });

  const { artists: catalogArtists, query, setQuery } = useArtistCatalogSearch({
    viewMode: 'all',
    userId: user?.id ?? null,
    enabled: !sessionLoading,
  });

  const { artists: popularArtists } = useExplorePopularArtists({
    fallbackShows: shows,
    enabled: !sessionLoading,
  });

  const cities = useMemo(() => collectExploreCities(shows), [shows]);
  const userCities = useMemo(() => {
    const fromUser = [...sections.going, ...sections.interested, ...sections.attended].map(
      (show) => show.venue.city
    );
    return fromUser;
  }, [sections.attended, sections.going, sections.interested]);

  const [selectedCity, setSelectedCity] = useState<string | null>(() => readExploreCityPreference());

  useEffect(() => {
    if (selectedCity && cities.includes(selectedCity)) return;
    const next = pickDefaultExploreCity({ cities, userShowCities: userCities });
    setSelectedCity(next);
    writeExploreCityPreference(next);
  }, [cities, selectedCity, userCities]);

  const onSelectCity = (city: string) => {
    setSelectedCity(city);
    writeExploreCityPreference(city);
  };

  const weekShows = useMemo(
    () => showsThisWeekInCity(shows, selectedCity),
    [selectedCity, shows]
  );
  const upcomingList = useMemo(
    () => upcomingShowsInCitySorted(shows, selectedCity, 10),
    [selectedCity, shows]
  );
  const venueBuckets = useMemo(
    () => buildVenueBuckets(shows, selectedCity),
    [selectedCity, shows]
  );
  const seenArtists = useMemo(() => artistsFromAttendedShows(sections.attended), [sections.attended]);

  const searchGroups = useMemo(
    () =>
      groupExploreSearch(
        query,
        catalogArtists,
        shows,
        uniqueVenuesFromShows(filterShowsByCity(shows, selectedCity))
      ),
    [catalogArtists, query, selectedCity, shows]
  );

  const hasCityContent = exploreHasCityContent({
    weekShows,
    upcoming: upcomingList,
    seenArtists,
    popularArtists,
    venues: venueBuckets,
  });

  const [venueModal, setVenueModal] = useState<ExploreVenueBucket | null>(null);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: tokens.background }}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.screenHorizontal,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
          gap: spacing.xl,
        }}
        refreshControl={
          <RefreshControl refreshing={isFetching && !showsLoading} onRefresh={() => void refetch()} />
        }
        keyboardShouldPersistTaps="handled">
        <Text style={[typography.largeTitle, { color: tokens.text }]}>{t('explore.title')}</Text>

        <TextInput
          placeholder={t('explore.searchPlaceholder')}
          placeholderTextColor={tokens.textSecondary}
          style={[
            styles.search,
            {
              backgroundColor: tokens.surface,
              color: tokens.text,
              borderColor: tokens.separator,
            },
          ]}
          value={query}
          onChangeText={setQuery}
        />

        {searchGroups ? (
          <View style={styles.section}>
            {searchGroups.artists.length > 0 ? (
              <>
                <SectionHeader title={t('explore.searchArtists')} />
                {searchGroups.artists.slice(0, 8).map((artist) => (
                  <ListRowLink key={artist.id} label={artist.name} onPress={() => router.push(`/artist/${artist.id}`)} />
                ))}
              </>
            ) : null}
            {searchGroups.shows.length > 0 ? (
              <>
                <SectionHeader title={t('explore.searchShows')} />
                {searchGroups.shows.slice(0, 8).map((show) => (
                  <ListRowLink
                    key={show.id}
                    label={`${show.artist.name} · ${show.venue.name}`}
                    onPress={() => router.push(`/show/${show.id}`)}
                  />
                ))}
              </>
            ) : null}
            {searchGroups.venues.length > 0 ? (
              <>
                <SectionHeader title={t('explore.searchVenues')} />
                {searchGroups.venues.slice(0, 8).map((venue) => (
                  <ListRowLink key={venue.id} label={`${venue.name} · ${venue.city}`} onPress={() => {}} />
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {cities.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityPills}>
            {cities.map((city) => {
              const active = city === selectedCity;
              return (
                <Pressable
                  key={city}
                  onPress={() => onSelectCity(city)}
                  style={[
                    styles.cityPill,
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
                    {city}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {hasCityContent && selectedCity ? (
          <>
            {weekShows.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t('explore.thisWeek', { city: selectedCity })} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
                  {weekShows.map((show) => (
                    <ExploreWeekCard key={show.id} show={show} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {upcomingList.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  actionLabel={t('explore.viewCalendar')}
                  title={t('explore.comingSoon')}
                  onActionPress={() => router.push('/shows')}
                />
                {upcomingList.map((show) => (
                  <ExploreUpcomingRow key={show.id} show={show} />
                ))}
              </View>
            ) : null}

            <ArtistCircleRow artists={seenArtists} title={t('explore.artistsSeen')} />
            <ArtistCircleRow artists={popularArtists} title={t('explore.popular')} />

            {venueBuckets.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader title={t('explore.venuesInCity', { city: selectedCity })} />
                <View style={styles.venueGrid}>
                  {venueBuckets.map((bucket) => (
                    <Pressable
                      key={bucket.venue.id}
                      style={[styles.venueTile, { backgroundColor: tokens.surface }]}
                      onPress={() => setVenueModal(bucket)}>
                      <Ionicons color={tokens.accent} name="location-outline" size={18} />
                      <Text style={[typography.bodySemibold, { color: tokens.text }]} numberOfLines={2}>
                        {bucket.venue.name}
                      </Text>
                      <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
                        {t('explore.venueUpcoming', { count: bucket.upcomingCount })}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </>
        ) : null}

        <Card>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>{t('explore.addShowTitle')}</Text>
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{t('explore.addShowSubtitle')}</Text>
          <PillButton title={t('explore.addShowCta')} onPress={() => router.push('/add-show')} />
        </Card>
      </ScrollView>

      <Modal visible={venueModal != null} animationType="slide" onRequestClose={() => setVenueModal(null)}>
        <View style={[styles.modalRoot, { backgroundColor: tokens.background, paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={[typography.title, { color: tokens.text, flex: 1 }]}>
              {venueModal?.venue.name}
            </Text>
            <PillButton title={t('common.close')} variant="secondary" onPress={() => setVenueModal(null)} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.screenHorizontal, gap: spacing.md }}>
            {venueModal?.shows.map((show) => (
              <ShowPhotoCarouselCard key={show.id} imageWidth={320} show={show} />
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function ListRowLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { tokens } = useEncoreTheme();
  return (
    <Pressable onPress={onPress} style={styles.searchRow}>
      <Text style={[typography.body, { color: tokens.text }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  artistCircle: {
    borderRadius: 42,
    height: 84,
    width: 84,
  },
  artistCircleItem: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 92,
  },
  artistRow: {
    gap: spacing.md,
  },
  carousel: {
    gap: spacing.md,
  },
  cityPill: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cityPills: {
    gap: spacing.sm,
  },
  dateBox: {
    alignItems: 'center',
    minWidth: 52,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
  modalRoot: {
    flex: 1,
  },
  search: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchRow: {
    paddingVertical: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  upcomingRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  upcomingThumb: {
    backgroundColor: '#222',
    borderRadius: 12,
    height: 52,
    width: 52,
  },
  venueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  venueTile: {
    borderRadius: 18,
    gap: spacing.xs,
    minHeight: 110,
    padding: spacing.md,
    width: '47%',
  },
  weekCard: {
    borderRadius: 22,
    height: HERO_IMAGE_HEIGHT,
    overflow: 'hidden',
    width: 280,
  },
  weekImage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#222',
  },
  weekPillWrap: {
    left: spacing.md,
    position: 'absolute',
    top: spacing.md,
  },
  weekText: {
    bottom: spacing.md,
    left: spacing.md,
    position: 'absolute',
    right: spacing.md,
  },
});
