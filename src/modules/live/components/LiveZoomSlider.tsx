import { useRef } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useTranslation } from '@/core/i18n';

import { formatZoomDisplay } from '../types';

type LiveZoomSliderProps = {
  value: number;
  onChange: (normalized: number) => void;
};

const TRACK_WIDTH = 208;
const THUMB_SIZE = 32;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function LiveZoomSlider({ value, onChange }: LiveZoomSliderProps) {
  const { t } = useTranslation();
  const trackWidthRef = useRef(TRACK_WIDTH);
  const dragStartRef = useRef(value);
  const valueRef = useRef(value);
  valueRef.current = value;

  const thumbTravel = trackWidthRef.current - THUMB_SIZE;
  const thumbLeft = value * thumbTravel;

  const setValueFromX = (x: number) => {
    const usable = Math.max(1, trackWidthRef.current - THUMB_SIZE);
    onChange(clamp01(x / usable));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartRef.current = valueRef.current;
      },
      onPanResponderMove: (_, gesture) => {
        const usable = Math.max(1, trackWidthRef.current - THUMB_SIZE);
        const next = dragStartRef.current + gesture.dx / usable;
        onChange(clamp01(next));
      },
    })
  ).current;

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    trackWidthRef.current = event.nativeEvent.layout.width;
  };

  const handleTrackPress = (locationX: number) => {
    setValueFromX(locationX - THUMB_SIZE / 2);
  };

  return (
    <View style={styles.wrapper}>
      <View
        accessibilityLabel={t('live.zoomSlider', { zoom: formatZoomDisplay(value) })}
        accessibilityRole="adjustable"
        style={styles.pill}>
        <Text style={styles.label}>{formatZoomDisplay(value)}</Text>

        <Pressable
          onPress={(event) => handleTrackPress(event.nativeEvent.locationX)}
          style={styles.trackPressable}>
          <View style={styles.track} onLayout={handleTrackLayout} {...panResponder.panHandlers}>
            <View style={styles.trackLine} />
            <View style={[styles.tick, styles.tickStart]} />
            <View style={[styles.tick, styles.tickMid]} />
            <View style={[styles.tick, styles.tickEnd]} />
            <View style={[styles.thumb, { left: thumbLeft }]} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: '#ffe566',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    minWidth: 42,
    textAlign: 'center',
  },
  pill: {
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.78)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  thumb: {
    backgroundColor: '#fff',
    borderRadius: 999,
    height: THUMB_SIZE,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    top: -((THUMB_SIZE - 4) / 2),
    width: THUMB_SIZE,
  },
  tick: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    height: 5,
    position: 'absolute',
    top: -1,
    width: 5,
  },
  tickEnd: {
    right: 0,
  },
  tickMid: {
    left: '50%',
    marginLeft: -2.5,
  },
  tickStart: {
    left: 0,
  },
  track: {
    height: 5,
    justifyContent: 'center',
    width: TRACK_WIDTH,
  },
  trackLine: {
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 999,
    height: 4,
    width: '100%',
  },
  trackPressable: {
    paddingVertical: 12,
  },
  wrapper: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
});
