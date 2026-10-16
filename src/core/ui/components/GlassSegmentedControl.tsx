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
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
};

const TRACK_HEIGHT = 40;
const THUMB_SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

export function GlassSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: GlassSegmentedControlProps<T>) {
  const { tokens, resolvedScheme } = useEncoreTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? (trackWidth - 6) / options.length : 0;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  const thumbX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    thumbX.value = withSpring(3 + selectedIndex * segmentWidth, THUMB_SPRING);
  }, [segmentWidth, selectedIndex, thumbX]);

  const thumbStyle = useAnimatedStyle(() => ({
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
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => {
                if (option.value === value) return;
                hapticSelection();
                onChange(option.value);
              }}
              style={styles.segment}>
              {option.icon ? (
                <Ionicons
                  color={selected ? tokens.accent : tokens.textSecondary}
                  name={option.icon}
                  size={14}
                />
              ) : null}
              <Text
                style={[
                  typography.footnoteSemibold,
                  { color: selected ? tokens.accent : tokens.textSecondary },
                ]}
                numberOfLines={1}>
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
          style={styles.glassTrack}>
          {trackBody}
        </GlassView>
      </View>
    );
  }

  return (
    <View onLayout={onTrackLayout}>
      <Glass style={[styles.glassTrack, { backgroundColor: tokens.glassFallback }]}>{trackBody}</Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  glassTrack: {
    borderRadius: radii.pill,
    height: TRACK_HEIGHT,
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
