import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { hapticImpactLight } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import type { LiveCameraPreviewRef } from './LiveCameraPreview';

const FOCUS_BOX = 72;
const FADE_MS = 2000;

type LiveCameraFocusOverlayProps = {
  previewRef: React.RefObject<LiveCameraPreviewRef | null>;
  enabled: boolean;
  focusPoint: { x: number; y: number } | null;
  focusLocked: boolean;
};

export function LiveCameraFocusOverlay({
  previewRef,
  enabled,
  focusPoint,
  focusLocked,
}: LiveCameraFocusOverlayProps) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartBiasRef = useRef(0);
  const crossedZeroRef = useRef(false);
  const [exposureLimits, setExposureLimits] = useState({ min: -2, max: 2 });

  const scheduleFade = useCallback(() => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    opacity.value = 1;
    fadeTimerRef.current = setTimeout(() => {
      if (!focusLocked) {
        opacity.value = withTiming(0, { duration: 400 });
      }
    }, FADE_MS);
  }, [focusLocked, opacity]);

  useEffect(() => {
    if (!enabled || !focusPoint) return;
    scheduleFade();
    void previewRef.current?.getNativeExposureBiasState().then((state) => {
      setExposureLimits({ min: state.min, max: state.max });
    });
  }, [enabled, focusPoint, previewRef, scheduleFade]);

  useEffect(() => {
    if (focusLocked) {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      opacity.value = 1;
    }
  }, [focusLocked, opacity]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    },
    []
  );

  const boxStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleExposurePan = async (event: PanGestureHandlerStateChangeEvent) => {
    const native = previewRef.current;
    if (!native || !focusPoint) return;

    if (event.nativeEvent.state === State.BEGAN) {
      const state = await native.getNativeExposureBiasState();
      dragStartBiasRef.current = state.bias;
      crossedZeroRef.current = false;
      setExposureLimits({ min: state.min, max: state.max });
      return;
    }

    if (event.nativeEvent.oldState !== State.ACTIVE) return;

    const dy = event.nativeEvent.translationY;
    const range = exposureLimits.max - exposureLimits.min;
    const delta = (-dy / 180) * range;
    const next = Math.min(exposureLimits.max, Math.max(exposureLimits.min, dragStartBiasRef.current + delta));

    if (
      (dragStartBiasRef.current > 0 && next <= 0) ||
      (dragStartBiasRef.current < 0 && next >= 0) ||
      (dragStartBiasRef.current !== 0 && Math.abs(next) < 0.02)
    ) {
      if (!crossedZeroRef.current) {
        crossedZeroRef.current = true;
        hapticImpactLight();
      }
    }

    await native.setNativeExposureBias(next);
    scheduleFade();
  };

  if (!enabled || !focusPoint) {
    return focusLocked ? (
      <View pointerEvents="none" style={styles.lockBanner}>
        <Text style={styles.lockLabel}>{t('live.focusExposureLocked')}</Text>
      </View>
    ) : null;
  }

  const left = focusPoint.x - FOCUS_BOX / 2;
  const top = focusPoint.y - FOCUS_BOX / 2;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {focusLocked ? (
        <View pointerEvents="none" style={styles.lockBanner}>
          <Text style={styles.lockLabel}>{t('live.focusExposureLocked')}</Text>
        </View>
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[styles.focusBox, { left, top, width: FOCUS_BOX, height: FOCUS_BOX }, boxStyle]}
      />
      <PanGestureHandler onHandlerStateChange={handleExposurePan}>
        <Animated.View
          style={[
            styles.sunHit,
            { left: focusPoint.x + FOCUS_BOX / 2 + 4, top: focusPoint.y - 12 },
            boxStyle,
          ]}>
          <Ionicons color="#FFD60A" name="sunny" size={28} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  focusBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FFD60A',
    borderRadius: 2,
  },
  sunHit: {
    position: 'absolute',
    padding: 8,
  },
  lockBanner: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  lockLabel: {
    color: '#FFD60A',
    fontSize: 13,
    fontWeight: '600',
  },
});
