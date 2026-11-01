import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { hapticSelection } from '@/core/haptics';
import { useEncoreTheme } from '../theme';
import { radii, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

import { Glass } from './Glass';

export type GlassSegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type GlassSegmentedControlProps<T extends string> = {
  options: GlassSegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
  segmentLayout?: 'inline' | 'stacked';
};

const TRACK_HEIGHT = 40;
const TRACK_HEIGHT_STACKED = 52;
const THUMB_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export function GlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  segmentLayout = 'inline',
}: GlassSegmentedControlProps<T>) {
  const stacked = segmentLayout === 'stacked';
  const trackHeight = stacked ? TRACK_HEIGHT_STACKED : TRACK_HEIGHT;
  const { tokens, resolvedScheme } = useEncoreTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? (trackWidth - 6) / options.length : 0;
  const selectedIndex =
    value === null ? -1 : options.findIndex((option) => option.value === value);

  const thumbX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth <= 0 || selectedIndex < 0) return;
    thumbX.value = withSpring(3 + selectedIndex * segmentWidth, THUMB_SPRING);
  }, [segmentWidth, selectedIndex, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: selectedIndex < 0 ? 0 : 1,
    transform: [{ translateX: thumbX.value }],
    width: Math.max(segmentWidth, 0),
  }));

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const trackBody = (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.thumb,
          {
            backgroundColor:
              resolvedScheme === 'dark' ? 'rgba(255,255,255,0.22)' : tokens.surface,
          },
          thumbStyle,
        ]}
      />
      <View style={styles.segmentsRow}>
        {options.map((option) => {
          const selected = value !== null && option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => {
                hapticSelection();
                onChange(option.value);
              }}
              style={[styles.segment, stacked && styles.segmentStacked]}>
              {option.icon ? (
                <Ionicons
                  color={selected ? tokens.accent : tokens.textSecondary}
                  name={option.icon}
                  size={stacked ? 16 : 14}
                />
              ) : null}
              <Text
                style={[
                  typography.footnoteSemibold,
                  { color: selected ? tokens.accent : tokens.textSecondary },
                ]}
                numberOfLines={stacked ? 2 : 1}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  if (isLiquidGlassAvailable()) {
    return (
      <View onLayout={onTrackLayout}>
        <GlassView
          glassEffectStyle="regular"
          colorScheme={resolvedScheme === 'dark' ? 'dark' : 'light'}
          style={[styles.glassTrack, { height: trackHeight }]}>
          {trackBody}
        </GlassView>
      </View>
    );
  }

  return (
    <View onLayout={onTrackLayout}>
      <Glass
        style={[styles.glassTrack, { backgroundColor: tokens.glassFallback, height: trackHeight }]}>
        {trackBody}
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  glassTrack: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    padding: 3,
  },
  segment: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: spacing.xs,
  },
  segmentStacked: {
    flexDirection: 'column',
    gap: 2,
    paddingHorizontal: spacing.sm,
  },
  segmentsRow: {
    flexDirection: 'row',
    height: '100%',
  },
  thumb: {
    borderRadius: radii.pill - 3,
    bottom: 3,
    left: 0,
    position: 'absolute',
    top: 3,
  },
});
