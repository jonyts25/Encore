import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme';

import {
  buildMyMapData,
  mapCoordinatesFromGroups,
  pinArtistForGroup,
  regionForSingleVenue,
  type MyMapVenueGroup,
} from '../myMapLogic';
import type { Show } from '../types';

const MAP_EDGE_PADDING = { top: 24, right: 24, bottom: 24, left: 24 };

type CompactConcertMapProps = {
  shows: Show[];
  height?: number;
  onPress?: () => void;
};

function VenueMapMarker({
  group,
  onPress,
}: {
  group: MyMapVenueGroup;
  onPress?: () => void;
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
            <Text style={[typography.footnoteSemibold, { color: tokens.text }]}>
              {pin.name.charAt(0)}
            </Text>
          </View>
        )}
      </View>
    </Marker>
  );
}

export function CompactConcertMap({ shows, height = 220, onPress }: CompactConcertMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapLayout, setMapLayout] = useState<LayoutRectangle | null>(null);
  const mapData = useMemo(() => buildMyMapData(shows), [shows]);
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
      animated: false,
    });
  }, [coordinates, mapLayout]);

  useEffect(() => {
    fitMap();
  }, [fitMap, shows]);

  if (coordinates.length === 0) return null;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <View
        style={[styles.mapShell, { height }]}
        onLayout={(event) => setMapLayout(event.nativeEvent.layout)}>
        <MapView
          ref={mapRef}
          pointerEvents="none"
          rotateEnabled={false}
          scrollEnabled={false}
          pitchEnabled={false}
          zoomEnabled={false}
          style={StyleSheet.absoluteFill}
          userInterfaceStyle="dark">
          {mapData.locatedGroups.map((group) => (
            <VenueMapMarker key={group.venue.id} group={group} />
          ))}
        </MapView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mapShell: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  markerImage: {
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  markerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
