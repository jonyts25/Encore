import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
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

const DIAL_HOLD_MS = 1500;
const LONG_PRESS_MS = 250;
const MARK_COUNT = 48;

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

function formatZoomLabel(factor: number): string {
  if (factor < 1) return `${factor.toFixed(1).replace(/^0\./, '.')}×`;
  if (Math.abs(factor - Math.round(factor)) < 0.05) return `${Math.round(factor)}×`;
  return `${factor.toFixed(1)}×`;
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
  const [mode, setMode] = useState<'chips' | 'dial'>('chips');
  const [trackWidth, setTrackWidth] = useState(0);
  const dialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const lastHapticLensRef = useRef<number | null>(null);
  const panStartZoomRef = useRef(currentZoom);
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
      pendingZoomRef.current = clampZoom(next, minZoom, cappedMax);
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        flushZoom();
      });
    },
    [cappedMax, flushZoom, minZoom]
  );

  useEffect(() => {
    return () => {
      if (dialTimeoutRef.current) clearTimeout(dialTimeoutRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const onPanGesture = (event: PanGestureHandlerGestureEvent) => {
    if (mode !== 'dial' || trackWidth <= 0) return;
    const delta = event.nativeEvent.translationX / trackWidth;
    const startPos = zoomToPosition(panStartZoomRef.current, minZoom, cappedMax);
    const next = positionToZoom(startPos + delta, minZoom, cappedMax);
    queueZoom(next);
    scheduleDialCollapse();
  };

  const onPanStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    if (event.nativeEvent.state === State.BEGAN) {
      panStartZoomRef.current = currentZoom;
    }
    if (event.nativeEvent.oldState === State.ACTIVE) {
      scheduleDialCollapse();
    }
  };

  const dialStyle = useAnimatedStyle(() => ({
    opacity: dialOpacity.value,
  }));

  const chipsStyle = useAnimatedStyle(() => ({
    opacity: chipsOpacity.value,
  }));

  const dialPosition = zoomToPosition(currentZoom, minZoom, cappedMax);

  return (
    <View style={styles.wrap}>
      {mode === 'dial' ? (
        <Text style={styles.readout}>{formatZoomLabel(currentZoom)}</Text>
      ) : null}

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
              <Glass style={styles.dialGlass}>
                <View style={styles.dialTrack} onLayout={onTrackLayout}>
                  {Array.from({ length: MARK_COUNT }).map((_, index) => {
                    const pos = index / (MARK_COUNT - 1);
                    const isMajor = sortedFactors.some(
                      (factor) => Math.abs(zoomToPosition(factor, minZoom, cappedMax) - pos) < 0.02
                    );
                    return (
                      <View
                        key={index}
                        style={[
                          styles.tick,
                          { left: `${pos * 100}%` },
                          isMajor ? styles.tickMajor : styles.tickMinor,
                        ]}
                      />
                    );
                  })}
                  <View style={[styles.thumb, { left: `${dialPosition * 100}%` }]} />
                  {sortedFactors.map((factor) => (
                    <Text
                      key={factor}
                      style={[
                        styles.lensLabel,
                        { left: `${zoomToPosition(factor, minZoom, cappedMax) * 100}%` },
                      ]}>
                      {formatZoomLabel(factor)}
                    </Text>
                  ))}
                </View>
              </Glass>
            </Animated.View>

            <Animated.View pointerEvents={mode === 'chips' ? 'auto' : 'none'} style={[styles.chipsLayer, chipsStyle]}>
              <Glass style={styles.chipsGlass}>
                <View style={styles.chipsRow}>
                  {sortedFactors.map((factor) => {
                    const selected = Math.abs(factor - activeChipFactor) < 0.05;
                    const label =
                      selected && Math.abs(factor - currentZoom) > 0.05
                        ? formatZoomLabel(currentZoom)
                        : formatZoomLabel(factor);
                    return (
                      <Pressable
                        key={factor}
                        accessibilityRole="button"
                        disabled={disabled}
                        onPress={() => onSetZoom(factor)}
                        style={[styles.chip, selected && styles.chipSelected]}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
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
  chip: {
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    minWidth: 38,
    paddingHorizontal: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chipText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  chipTextSelected: {
    color: tokens.zoomSelected,
  },
  chipsGlass: {
    borderRadius: 22,
    paddingHorizontal: 6,
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
  dialGlass: {
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dialLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  dialTrack: {
    height: 36,
    justifyContent: 'center',
  },
  hitArea: {
    minHeight: 46,
    width: '100%',
  },
  lensLabel: {
    bottom: -2,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    position: 'absolute',
    transform: [{ translateX: -12 }],
  },
  readout: {
    color: tokens.zoomSelected,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  thumb: {
    backgroundColor: tokens.zoomSelected,
    borderRadius: 6,
    height: 12,
    marginTop: -6,
    position: 'absolute',
    transform: [{ translateX: -6 }],
    width: 12,
  },
  tick: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    bottom: 14,
    position: 'absolute',
    width: 1,
  },
  tickMajor: {
    height: 16,
  },
  tickMinor: {
    height: 8,
    opacity: 0.6,
  },
  wrap: {
    alignItems: 'center',
    width: '100%',
  },
});
