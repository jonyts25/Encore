import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutRectangle,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { useIsOffline } from '@/core/network/useIsOffline';
import { Card } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { spacing, typography } from '@/core/ui/theme';
import { useSession } from '@/modules/identity';

import { formatShowDate } from '../api';
import { useMyConcertMap } from '../hooks/useMyConcertMap';
import { useMyMapVenueGeocodeBackfill } from '../hooks/useMyMapVenueGeocodeBackfill';
import {
  mapCoordinatesFromGroups,
  pinArtistForGroup,
  regionForSingleVenue,
  type MyMapVenueGroup,
} from '../myMapLogic';
import type { Show } from '../types';

const MAP_EDGE_PADDING = { top: 72, right: 40, bottom: 220, left: 40 };

function VenueMapMarker({
  group,
  onPress,
}: {
  group: MyMapVenueGroup;
  onPress: () => void;
}) {
  const { tokens } = useEncoreTheme();
  const pin = pinArtistForGroup(group);

  return (
    <Marker
      coordinate={{
        latitude: group.venue.lat as number,
        longitude: group.venue.lng as number,
      }}
      tracksViewChanges={false}
      onPress={onPress}>
      <View style={styles.markerWrap}>
        {pin.imageUrl ? (
          <Image contentFit="cover" source={{ uri: pin.imageUrl }} style={styles.markerImage} />
        ) : (
          <View style={[styles.markerImage, { backgroundColor: tokens.fillMuted }]}>
            <Text style={[typography.bodySemibold, { color: tokens.text }]}>
              {pin.name.charAt(0)}
            </Text>
          </View>
        )}
        {pin.extraCount > 0 ? (
          <View style={[styles.markerBadge, { backgroundColor: tokens.accent }]}>
            <Text style={[typography.footnoteSemibold, { color: tokens.onAccent }]}>
              +{pin.extraCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

function VenueShowsSheet({
  group,
  visible,
  onClose,
}: {
  group: MyMapVenueGroup | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const insets = useSafeAreaInsets();

  if (!group) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: tokens.surface,
              paddingBottom: insets.bottom + spacing.md,
            },
          ]}>
        <View style={[styles.sheetHandle, { backgroundColor: tokens.separator }]} />
        <Text style={[typography.title, { color: tokens.text }]}>{group.venue.name}</Text>
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
          {[group.venue.city, group.venue.country].filter(Boolean).join(', ')}
        </Text>
        <ScrollView style={styles.sheetList} contentContainerStyle={{ gap: spacing.sm }}>
          {group.shows.map((show) => (
            <Pressable
              key={show.id}
              style={[styles.sheetRow, { borderColor: tokens.separator }]}
              onPress={() => {
                onClose();
                router.push(`/show/${show.id}`);
              }}>
              <Text style={[typography.bodySemibold, { color: tokens.text }]}>
                {show.artist.name}
              </Text>
              <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
                {formatShowDate(show.show_date, i18n.language)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function VenueListFallback({
  groups,
  unlocatedShows,
  title,
}: {
  groups: MyMapVenueGroup[];
  unlocatedShows: Show[];
  title?: string;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      {title ? (
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{title}</Text>
      ) : null}
      {groups.map((group) => (
        <Card key={group.venue.id} style={{ gap: spacing.sm }}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>{group.venue.name}</Text>
          <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
            {[group.venue.city, group.venue.country].filter(Boolean).join(', ')}
          </Text>
          {group.shows.map((show) => (
            <Pressable key={show.id} onPress={() => router.push(`/show/${show.id}`)}>
              <Text style={[typography.body, { color: tokens.text }]}>
                {show.artist.name} · {formatShowDate(show.show_date, i18n.language)}
              </Text>
            </Pressable>
          ))}
        </Card>
      ))}
      {unlocatedShows.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.bodySemibold, { color: tokens.text }]}>
            {t('myMap.unlocatedTitle', { count: unlocatedShows.length })}
          </Text>
          {unlocatedShows.map((show) => (
            <Pressable key={show.id} onPress={() => router.push(`/show/${show.id}`)}>
              <Text style={[typography.body, { color: tokens.text }]}>
                {show.artist.name} · {show.venue.name} ·{' '}
                {formatShowDate(show.show_date, i18n.language)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function MyMapScreenContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const { user, session } = useSession();
  const isOffline = useIsOffline();
  const mapRef = useRef<MapView | null>(null);
  const [mapLayout, setMapLayout] = useState<LayoutRectangle | null>(null);
  const [year, setYear] = useState<number | 'all'>('all');
  const [selectedGroup, setSelectedGroup] = useState<MyMapVenueGroup | null>(null);

  const { attendedShows, mapData, allYearsData, isLoading, error, refetch } = useMyConcertMap({
    userId: user?.id ?? null,
    enabled: Boolean(user),
    year,
  });

  const onGeocodeFinished = useCallback(() => {
    void refetch();
  }, [refetch]);

  const { isGeocoding } = useMyMapVenueGeocodeBackfill({
    attendedShows,
    accessToken: session?.access_token,
    isOffline,
    enabled: Boolean(user) && !isLoading,
    onFinished: onGeocodeFinished,
  });

  const statsLine = t('myMap.summaryLine', {
    concerts: allYearsData.stats.concerts,
    cities: allYearsData.stats.cities,
    countries: allYearsData.stats.countries,
  });

  const coordinates = useMemo(
    () => mapCoordinatesFromGroups(mapData.locatedGroups),
    [mapData.locatedGroups]
  );

  const fitMap = useCallback(() => {
    if (!mapRef.current || coordinates.length === 0 || !mapLayout) return;
    if (coordinates.length === 1) {
      mapRef.current.animateToRegion(regionForSingleVenue(coordinates[0]!), 350);
      return;
    }
    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: MAP_EDGE_PADDING,
      animated: true,
    });
  }, [coordinates, mapLayout]);

  useEffect(() => {
    fitMap();
  }, [fitMap, year]);

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

  const showMap = !isOffline && coordinates.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: spacing.screenHorizontal, gap: spacing.sm }}>
          <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{statsLine}</Text>
          {isGeocoding ? (
            <Text style={[typography.footnote, { color: tokens.textSecondary }]}>
              {t('myMap.geocodingVenues')}
            </Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Pressable
              style={[
                styles.chip,
                {
                  backgroundColor: year === 'all' ? tokens.accent : tokens.fillMuted,
                },
              ]}
              onPress={() => setYear('all')}>
              <Text
                style={[
                  typography.footnote,
                  { color: year === 'all' ? tokens.onAccent : tokens.text },
                ]}>
                {t('myMap.yearAll')}
              </Text>
            </Pressable>
            {allYearsData.years.map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: year === value ? tokens.accent : tokens.fillMuted,
                  },
                ]}
                onPress={() => setYear(value)}>
                <Text
                  style={[
                    typography.footnote,
                    { color: year === value ? tokens.onAccent : tokens.text },
                  ]}>
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {showMap ? (
          <View
            style={styles.mapWrap}
            onLayout={(event) => {
              setMapLayout(event.nativeEvent.layout);
            }}>
            <MapView ref={mapRef} style={styles.map} showsUserLocation={false}>
              {mapData.locatedGroups.map((group) => (
                <VenueMapMarker
                  key={group.venue.id}
                  group={group}
                  onPress={() => setSelectedGroup(group)}
                />
              ))}
            </MapView>
          </View>
        ) : (
          <View style={{ paddingHorizontal: spacing.screenHorizontal, gap: spacing.sm }}>
            {isOffline ? (
              <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
                {t('myMap.offlineNotice')}
              </Text>
            ) : null}
            <VenueListFallback
              groups={mapData.locatedGroups}
              unlocatedShows={mapData.unlocatedShows}
            />
          </View>
        )}

        {showMap && mapData.unlocatedShows.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.screenHorizontal }}>
            <VenueListFallback
              groups={[]}
              unlocatedShows={mapData.unlocatedShows}
              title={t('myMap.unlocatedTitle', { count: mapData.unlocatedShows.length })}
            />
          </View>
        ) : null}

        {showMap && mapData.locatedGroups.length === 0 && mapData.unlocatedShows.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.screenHorizontal }}>
            <Text style={[typography.secondary, { color: tokens.textSecondary }]}>
              {t('myMap.empty')}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <VenueShowsSheet
        group={selectedGroup}
        visible={Boolean(selectedGroup)}
        onClose={() => setSelectedGroup(null)}
      />
    </View>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipsRow: {
    gap: spacing.sm,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  mapWrap: {
    height: 360,
    marginHorizontal: spacing.screenHorizontal,
    overflow: 'hidden',
    borderRadius: 16,
  },
  markerBadge: {
    alignItems: 'center',
    borderRadius: 10,
    bottom: -2,
    justifyContent: 'center',
    minWidth: 22,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: -4,
  },
  markerImage: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  markerWrap: {
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: spacing.sm,
    maxHeight: '55%',
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetHandle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.xs,
    width: 40,
  },
  sheetList: {
    marginTop: spacing.sm,
  },
  sheetRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
    paddingVertical: spacing.sm,
  },
});
