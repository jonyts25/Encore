import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  LongPressGestureHandler,
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { hapticSelection } from '@/core/haptics';
import { Glass } from '@/core/ui';
import { darkTokens } from '@/core/ui/theme/tokens';

const DIAL_HOLD_MS = 1200;
const LONG_PRESS_MS = 200;
const ARC_HEIGHT = 90;
const CAPSULE_HEIGHT = 40;
const CHIP_SIZE = 32;
const CHIP_SIZE_ACTIVE = 38;
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

function zoomToPosition(zoom: number, min: number, max: number): number {
  const safeMin = Math.max(min, 0.1);
  const safeMax = Math.max(max, safeMin + 0.01);
  const logMin = Math.log(safeMin);
  const logMax = Math.log(safeMax);
  return (Math.log(clampZoom(zoom, safeMin, safeMax)) - logMin) / (logMax - logMin);
}

function positionToZoom(position: number, min: number, max: number): number {
  const safeMin = Math.max(min, 0.1);
  const safeMax = Math.max(max, safeMin + 0.01);
  const logMin = Math.log(safeMin);
  const logMax = Math.log(safeMax);
  const t = clampZoom(position, 0, 1);
  return Math.exp(logMin + t * (logMax - logMin));
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

export function LiveZoomDial({
  lensFactors,
  minZoom,
  maxZoom,
  currentZoom,
  disabled,
  onSetZoom,
}: LiveZoomDialProps) {
  const cappedMax = Math.min(maxZoom, 10);
  const screenWidth = Dimensions.get('window').width;
  const arcRadius = screenWidth * 0.95;
  const arcSpan = Math.PI * 0.82;
  const arcStart = -arcSpan / 2;

  const [mode, setMode] = useState<'chips' | 'dial'>('chips');
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const lastHapticLensRef = useRef<number | null>(null);
  const panStartZoomRef = useRef(currentZoom);
  const wheelRotation = useSharedValue(0);
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
    const marks = new Set<number>(sortedFactors);
    for (const label of LABEL_MARKS) {
      if (label >= minZoom - 0.01 && label <= cappedMax + 0.01) marks.add(label);
    }
    for (let step = 0; step <= 100; step += 1) {
      const factor = Math.round((minZoom + (step / 100) * (cappedMax - minZoom)) * 10) / 10;
      marks.add(factor);
    }
    return [...marks].sort((a, b) => a - b);
  }, [cappedMax, minZoom, sortedFactors]);

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
    scheduleDialCollapse();
  }, [chipsOpacity, dialOpacity, disabled, scheduleDialCollapse]);

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
      const position = zoomToPosition(clamped, minZoom, cappedMax);
      wheelRotation.value = withTiming(-position * arcSpan, { duration: 16 });
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flushZoom();
      });
    },
    [arcSpan, cappedMax, flushZoom, minZoom, wheelRotation]
  );

  useEffect(() => {
    const position = zoomToPosition(currentZoom, minZoom, cappedMax);
    wheelRotation.value = withTiming(-position * arcSpan, { duration: mode === 'chips' ? 250 : 16 });
  }, [arcSpan, cappedMax, currentZoom, minZoom, mode, wheelRotation]);

  useEffect(() => {
    return () => {
      if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onPanGesture = (event: PanGestureHandlerGestureEvent) => {
    if (mode !== 'dial') return;
    const delta = -event.nativeEvent.translationX / (screenWidth * 0.55);
    const startPos = zoomToPosition(panStartZoomRef.current, minZoom, cappedMax);
    queueZoom(positionToZoom(startPos + delta, minZoom, cappedMax));
    scheduleDialCollapse();
  };

  const onPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.BEGAN) {
      panStartZoomRef.current = currentZoom;
    }
    if (event.nativeEvent.oldState === State.ACTIVE && mode === 'dial') {
      scheduleDialCollapse();
    }
  };

  const dialStyle = useAnimatedStyle(() => ({
    opacity: dialOpacity.value,
  }));

  const chipsStyle = useAnimatedStyle(() => ({
    opacity: chipsOpacity.value,
  }));

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wheelRotation.value}rad` }],
  }));

  const renderArcMarks = () =>
    markFactors.map((factor) => {
      const position = zoomToPosition(factor, minZoom, cappedMax);
      const angle = arcStart + position * arcSpan;
      const x = arcRadius + arcRadius * Math.sin(angle);
      const y = arcRadius - arcRadius * Math.cos(angle);
      const isLens = sortedFactors.some((value) => Math.abs(value - factor) < 0.05);
      const isInteger = Math.abs(factor - Math.round(factor)) < 0.05;
      const showLabel = isLens || LABEL_MARKS.includes(factor) || isInteger;
      return (
        <View
          key={`mark-${factor}`}
          style={[
            styles.markWrap,
            {
              left: x,
              top: y,
              transform: [{ rotate: `${angle}rad` }],
            },
          ]}>
          <View style={[styles.markLine, isLens || isInteger ? styles.markLineMajor : styles.markLineMinor]} />
          {showLabel ? (
            <Text style={styles.markLabel}>{formatChipLabel(factor, false, factor)}</Text>
          ) : null}
        </View>
      );
    });

  return (
    <View style={styles.wrap}>
      <LongPressGestureHandler
        enabled={!disabled}
        minDurationMs={LONG_PRESS_MS}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.ACTIVE) {
            openDial();
          }
        }}>
        <PanGestureHandler
          enabled={!disabled}
          onGestureEvent={onPanGesture}
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === State.BEGAN && mode === 'chips') {
              openDial();
            }
            onPanStateChange(event);
          }}>
          <View style={styles.hitArea}>
            <Animated.View pointerEvents={mode === 'dial' ? 'auto' : 'none'} style={[styles.dialLayer, dialStyle]}>
              <Text style={styles.readout}>{formatZoomReadout(currentZoom)}</Text>
              <View style={styles.arcClip}>
                <LinearGradient
                  colors={['rgba(20,20,22,0.92)', 'rgba(20,20,22,0.55)', 'rgba(20,20,22,0)']}
                  locations={[0, 0.55, 1]}
                  style={styles.arcFade}
                />
                <Animated.View
                  style={[
                    styles.wheel,
                    { width: arcRadius * 2, height: arcRadius * 2, borderRadius: arcRadius },
                    wheelStyle,
                  ]}>
                  <Glass style={styles.wheelGlass}>{renderArcMarks()}</Glass>
                </Animated.View>
                <View style={styles.needle} />
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
        </PanGestureHandler>
      </LongPressGestureHandler>
    </View>
  );
}

const tokens = darkTokens;

const styles = StyleSheet.create({
  arcClip: {
    height: ARC_HEIGHT,
    overflow: 'hidden',
    width: '100%',
  },
  arcFade: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
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
    paddingBottom: 2,
  },
  hitArea: {
    minHeight: ARC_HEIGHT + 24,
    width: '100%',
  },
  markLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
    textAlign: 'center',
  },
  markLine: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 999,
    width: 1,
  },
  markLineMajor: {
    height: 14,
  },
  markLineMinor: {
    height: 7,
    opacity: 0.55,
  },
  markWrap: {
    alignItems: 'center',
    position: 'absolute',
  },
  needle: {
    alignSelf: 'center',
    backgroundColor: tokens.zoomSelected,
    borderRadius: 2,
    bottom: 4,
    height: 18,
    position: 'absolute',
    width: 3,
    zIndex: 4,
  },
  readout: {
    color: tokens.zoomSelected,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
    zIndex: 5,
  },
  wheel: {
    alignSelf: 'center',
    bottom: -(Dimensions.get('window').width * 0.95 - ARC_HEIGHT + 8),
    position: 'absolute',
  },
  wheelGlass: {
    ...StyleSheet.absoluteFill,
    opacity: 0.92,
  },
  wrap: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
});
