import { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { SyncedLine } from '@/modules/lyrics';

import type { LiveFloatingHeight } from '../types';
import { LiveLyricsOverlay } from './LiveLyricsOverlay';

type LiveFloatingLyricsProps = {
  contentTopInset: number;
  height: LiveFloatingHeight;
  isLoading: boolean;
  isUnavailable: boolean;
  plainLyrics?: string;
  syncedLines?: SyncedLine[] | null;
  durationSeconds?: number | null;
};

export function LiveFloatingLyrics({
  contentTopInset,
  height,
  isLoading,
  isUnavailable,
  plainLyrics,
  syncedLines,
  durationSeconds,
}: LiveFloatingLyricsProps) {
  const pan = useRef(new Animated.ValueXY({ x: 16, y: contentTopInset + 72 })).current;
  const positionRef = useRef({ x: 16, y: contentTopInset + 72 });
  const bounds = useRef({ width: 0, height: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: positionRef.current.x,
          y: positionRef.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        const nextX = positionRef.current.x + gesture.dx;
        const nextY = positionRef.current.y + gesture.dy;
        const maxX = Math.max(8, bounds.current.width - 228);
        const maxY = Math.max(contentTopInset + 8, bounds.current.height - height - 120);
        const clampedX = Math.min(Math.max(8, nextX), maxX);
        const clampedY = Math.min(Math.max(contentTopInset + 8, nextY), maxY);

        positionRef.current = { x: clampedX, y: clampedY };
        pan.flattenOffset();
        pan.setValue({ x: clampedX, y: clampedY });
      },
    })
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    bounds.current = event.nativeEvent.layout;
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={handleLayout}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.panel,
          {
            height,
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}>
        <LiveLyricsOverlay
          contentTopInset={8}
          durationSeconds={durationSeconds}
          isLoading={isLoading}
          isUnavailable={isUnavailable}
          layout="floating"
          plainLyrics={plainLyrics}
          syncedLines={syncedLines}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 220,
    zIndex: 15,
  },
});
