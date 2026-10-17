import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';

import { hapticSelection } from '@/core/haptics';
import { Glass } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';

const DIAL_HOLD_MS = 1200;
const LONG_PRESS_MS = 250;
const RULER_HEIGHT = 64;
const CAPSULE_HEIGHT = 40;
const CHIP_SIZE = 32;
const CHIP_SIZE_ACTIVE = 38;
const PIXELS_PER_LOG2 = 110;
const LABEL_MARKS = [0.5, 1, 2, 4, 10];

type LiveZoomDialProps = {
  lensFactors: number[];
  minZoom: number;
  maxZoom: number;
  currentZoom: number;
  disabled?: boolean;
  onSetZoom: (factor: number) => void;
};

function clampZoom(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function zoomToOffset(zoom: number, min: number): number {
  const safeMin = Math.max(min, 0.1);
  const safeZoom = Math.max(zoom, safeMin);
  return (Math.log(safeZoom / safeMin) / Math.LN2) * PIXELS_PER_LOG2;
}

function offsetToZoom(offset: number, min: number, max: number): number {
  const safeMin = Math.max(min, 0.1);
  const safeMax = Math.max(max, safeMin + 0.01);
  const zoom = safeMin * 2 ** (offset / PIXELS_PER_LOG2);
  return clampZoom(zoom, safeMin, safeMax);
}

function formatZoomReadout(factor: number): string {
  if (factor < 1) return `${factor.toFixed(1).replace(/^0\./, '.')}×`;
  if (Math.abs(factor - Math.round(factor)) < 0.05) return `${Math.round(factor)}×`;
  return `${factor.toFixed(1)}×`;
}

function formatChipLabel(factor: number, active: boolean, liveZoom: number): string {
  if (active && Math.abs(factor - liveZoom) > 0.05) {
    return formatZoomReadout(liveZoom);
  }
  if (active) return formatZoomReadout(factor);
  if (factor < 1) return factor.toFixed(1).replace(/^0\./, '.');
  if (Math.abs(factor - Math.round(factor)) < 0.05) return `${Math.round(factor)}`;
  return `${factor.toFixed(1)}`;
}

function formatMarkLabel(factor: number): string {
  if (factor < 1) return factor.toFixed(1).replace(/^0\./, '.');
  if (Math.abs(factor - Math.round(factor)) < 0.05) return `${Math.round(factor)}`;
  return `${factor.toFixed(1)}`;
}

function nearestLensFactor(factors: number[], zoom: number): number {
  if (factors.length === 0) return zoom;
  let best = factors[0];
  let bestDelta = Math.abs(best - zoom);
  for (const factor of factors) {
    const delta = Math.abs(factor - zoom);
    if (delta < bestDelta) {
      best = factor;
      bestDelta = delta;
    }
  }
  return best;
}

function isMajorMark(factor: number, lensFactors: number[]): boolean {
  const isLens = lensFactors.some((value) => Math.abs(value - factor) < 0.05);
  const isInteger = Math.abs(factor - Math.round(factor)) < 0.05;
  return isLens || isInteger || LABEL_MARKS.some((mark) => Math.abs(mark - factor) < 0.05);
}

export function LiveZoomDial({
  lensFactors,
  minZoom,
  maxZoom,
  currentZoom,
  disabled,
  onSetZoom,
}: LiveZoomDialProps) {
  const { width: screenWidth } = useWindowDimensions();
  const cappedMax = Math.min(maxZoom, 10);
  const centerX = screenWidth / 2;

  const [mode, setMode] = useState<'chips' | 'dial'>('chips');
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const lastHapticLensRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isPanningRef = useRef(false);

  const translateX = useSharedValue(centerX - zoomToOffset(currentZoom, minZoom));
  const panStartOffset = useSharedValue(0);
  const dialOpacity = useSharedValue(0);
  const chipsOpacity = useSharedValue(1);

  const sortedFactors = useMemo(
    () => [...new Set(lensFactors)].sort((a, b) => a - b),
    [lensFactors]
  );

  const activeChipFactor = useMemo(
    () => nearestLensFactor(sortedFactors, currentZoom),
    [currentZoom, sortedFactors]
  );

  const markFactors = useMemo(() => {
    const marks: number[] = [];
    const step = 0.1;
    for (let z = minZoom; z <= cappedMax + step * 0.5; z += step) {
      marks.push(Math.round(z * 10) / 10);
    }
    return marks;
  }, [cappedMax, minZoom]);

  const rulerWidth = useMemo(
    () => zoomToOffset(cappedMax, minZoom) + screenWidth,
    [cappedMax, minZoom, screenWidth]
  );

  const minTranslateX = centerX - zoomToOffset(cappedMax, minZoom);
  const maxTranslateX = centerX - zoomToOffset(minZoom, minZoom);

  const scheduleDialCollapse = useCallback(() => {
    if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
    dialTimeoutRef.current = setTimeout(() => {
      setMode('chips');
      dialOpacity.value = withTiming(0, { duration: 200 });
      chipsOpacity.value = withTiming(1, { duration: 200 });
    }, DIAL_HOLD_MS);
  }, [chipsOpacity, dialOpacity]);

  const openDial = useCallback(() => {
    if (disabled) return;
    setMode('dial');
    dialOpacity.value = withTiming(1, { duration: 200 });
    chipsOpacity.value = withTiming(0, { duration: 200 });
    translateX.value = centerX - zoomToOffset(currentZoom, minZoom);
    scheduleDialCollapse();
  }, [
    centerX,
    chipsOpacity,
    currentZoom,
    dialOpacity,
    disabled,
    minZoom,
    scheduleDialCollapse,
    translateX,
  ]);

  const flushZoom = useCallback(() => {
    if (pendingZoomRef.current === null) return;
    const next = pendingZoomRef.current;
    pendingZoomRef.current = null;
    onSetZoom(next);

    const lens = nearestLensFactor(sortedFactors, next);
    if (lastHapticLensRef.current !== lens) {
      lastHapticLensRef.current = lens;
      hapticSelection();
    }
  }, [onSetZoom, sortedFactors]);

  const queueZoom = useCallback(
    (next: number) => {
      const clamped = clampZoom(next, minZoom, cappedMax);
      pendingZoomRef.current = clamped;
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flushZoom();
      });
    },
    [cappedMax, flushZoom, minZoom]
  );

  const syncTranslateFromZoom = useCallback(
    (zoom: number, animated: boolean) => {
      const target = centerX - zoomToOffset(zoom, minZoom);
      if (animated) {
        translateX.value = withTiming(target, { duration: mode === 'chips' ? 250 : 16 });
      } else {
        translateX.value = target;
      }
    },
    [centerX, minZoom, mode, translateX]
  );

  const applyZoomFromTranslate = useCallback(
    (tx: number) => {
      const offset = centerX - tx;
      queueZoom(offsetToZoom(offset, minZoom, cappedMax));
    },
    [cappedMax, centerX, minZoom, queueZoom]
  );

  const setPanning = useCallback((value: boolean) => {
    isPanningRef.current = value;
  }, []);

  const openDialIfChips = useCallback(() => {
    if (modeRef.current === 'chips') openDial();
  }, [openDial]);

  useEffect(() => {
    if (isPanningRef.current) return;
    syncTranslateFromZoom(currentZoom, true);
  }, [currentZoom, syncTranslateFromZoom]);

  useEffect(() => {
    return () => {
      if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const dialStyle = useAnimatedStyle(() => ({
    opacity: dialOpacity.value,
  }));

  const chipsStyle = useAnimatedStyle(() => ({
    opacity: chipsOpacity.value,
  }));

  const marksStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .onBegin(() => {
          runOnJS(setPanning)(true);
          runOnJS(openDialIfChips)();
          panStartOffset.value = centerX - translateX.value;
        })
        .onUpdate((event) => {
          const nextTx = centerX - (panStartOffset.value - event.translationX);
          const clampedTx = Math.min(maxTranslateX, Math.max(minTranslateX, nextTx));
          translateX.value = clampedTx;
          runOnJS(applyZoomFromTranslate)(clampedTx);
        })
        .onEnd((event) => {
          runOnJS(setPanning)(false);
          translateX.value = withDecay(
            {
              velocity: event.velocityX,
              clamp: [minTranslateX, maxTranslateX],
            },
            (finished) => {
              'worklet';
              if (finished) {
                runOnJS(applyZoomFromTranslate)(translateX.value);
              }
            }
          );
          runOnJS(scheduleDialCollapse)();
        }),
    [
      applyZoomFromTranslate,
      centerX,
      disabled,
      maxTranslateX,
      minTranslateX,
      openDialIfChips,
      panStartOffset,
      scheduleDialCollapse,
      setPanning,
      translateX,
    ]
  );

  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(!disabled)
        .minDuration(LONG_PRESS_MS)
        .onStart(() => {
          runOnJS(openDial)();
        }),
    [disabled, openDial]
  );

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(longPressGesture, panGesture),
    [longPressGesture, panGesture]
  );

  const renderRulerMarks = () =>
    markFactors.map((factor) => {
      const x = zoomToOffset(factor, minZoom);
      const major = isMajorMark(factor, sortedFactors);
      return (
        <View key={`mark-${factor}`} style={[styles.markColumn, { left: x }]}>
          <View style={[styles.markLine, major ? styles.markLineMajor : styles.markLineMinor]} />
          {major ? <Text style={styles.markLabel}>{formatMarkLabel(factor)}</Text> : null}
        </View>
      );
    });

  return (
    <View style={styles.wrap}>
      <GestureDetector gesture={composedGesture}>
        <View style={styles.hitArea}>
          <Animated.View pointerEvents={mode === 'dial' ? 'auto' : 'none'} style={[styles.dialLayer, dialStyle]}>
            <Text style={styles.readout}>{formatZoomReadout(currentZoom)}</Text>
            <View style={styles.rulerClip}>
              <Animated.View style={[styles.rulerTrack, { width: rulerWidth }, marksStyle]}>
                {renderRulerMarks()}
              </Animated.View>
              <View pointerEvents="none" style={styles.needle} />
              <LinearGradient
                colors={['rgba(0,0,0,0.9)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
                end={{ x: 1, y: 0 }}
                locations={[0, 0.18, 0.82, 1]}
                pointerEvents="none"
                start={{ x: 0, y: 0 }}
                style={styles.edgeFade}
              />
            </View>
          </Animated.View>

          <Animated.View pointerEvents={mode === 'chips' ? 'auto' : 'none'} style={[styles.chipsLayer, chipsStyle]}>
            <Glass style={styles.chipsGlass}>
              <View style={styles.chipsRow}>
                {sortedFactors.map((factor) => {
                  const selected = Math.abs(factor - activeChipFactor) < 0.05;
                  return (
                    <Pressable
                      key={factor}
                      accessibilityRole="button"
                      disabled={disabled}
                      onPress={() => {
                        hapticSelection();
                        onSetZoom(factor);
                      }}
                      style={styles.chipPressable}>
                      <Animated.View style={[styles.chip, selected ? styles.chipActive : styles.chipIdle]}>
                        <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                          {formatChipLabel(factor, selected, currentZoom)}
                        </Text>
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>
            </Glass>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const tokens = darkTokens;

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: CHIP_SIZE_ACTIVE / 2,
    height: CHIP_SIZE_ACTIVE,
    minWidth: CHIP_SIZE_ACTIVE,
    paddingHorizontal: 6,
  },
  chipIdle: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: CHIP_SIZE / 2,
    height: CHIP_SIZE,
    minWidth: CHIP_SIZE,
    paddingHorizontal: 4,
  },
  chipPressable: {
    borderRadius: 999,
  },
  chipText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    textAlign: 'center',
  },
  chipTextActive: {
    color: tokens.zoomSelected,
    fontWeight: '700',
  },
  chipsGlass: {
    borderRadius: CAPSULE_HEIGHT / 2,
    minHeight: CAPSULE_HEIGHT,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  chipsLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  dialLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  edgeFade: {
    ...StyleSheet.absoluteFill,
  },
  hitArea: {
    height: RULER_HEIGHT + 28,
    width: '100%',
  },
  markColumn: {
    alignItems: 'center',
    bottom: 10,
    position: 'absolute',
  },
  markLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
    textAlign: 'center',
  },
  markLine: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
    width: 1,
  },
  markLineMajor: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    height: 14,
    width: 1.5,
  },
  markLineMinor: {
    height: 8,
    opacity: 1,
  },
  needle: {
    alignSelf: 'center',
    backgroundColor: tokens.zoomSelected,
    borderRadius: 1,
    bottom: 8,
    height: 22,
    position: 'absolute',
    width: 2,
    zIndex: 3,
  },
  readout: {
    color: tokens.zoomSelected,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    zIndex: 5,
  },
  rulerClip: {
    height: RULER_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  rulerTrack: {
    height: RULER_HEIGHT,
  },
  wrap: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
});
