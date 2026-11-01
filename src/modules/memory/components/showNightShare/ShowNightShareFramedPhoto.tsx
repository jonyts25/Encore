import { Image, type ImageSource } from 'expo-image';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { ShowNightShareFrameTransform } from '../../showNightShareMediaPreference';

type Props = {
  source: ImageSource;
  width: number;
  height: number;
  frame: ShowNightShareFrameTransform;
  interactive?: boolean;
  onFrameChange?: (frame: ShowNightShareFrameTransform) => void;
  onLoad?: () => void;
  borderRadius?: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function ShowNightShareFramedPhoto({
  source,
  width,
  height,
  frame,
  interactive = false,
  onFrameChange,
  onLoad,
  borderRadius = 0,
}: Props) {
  const scale = useSharedValue(frame.scale);
  const translateX = useSharedValue(frame.translateX);
  const translateY = useSharedValue(frame.translateY);
  const startScale = useSharedValue(frame.scale);
  const startX = useSharedValue(frame.translateX);
  const startY = useSharedValue(frame.translateY);

  useEffect(() => {
    scale.value = frame.scale;
    translateX.value = frame.translateX;
    translateY.value = frame.translateY;
  }, [frame.scale, frame.translateX, frame.translateY, scale, translateX, translateY]);

  const commitFrame = useCallback(
    (next: ShowNightShareFrameTransform) => {
      onFrameChange?.(next);
    },
    [onFrameChange]
  );

  const clampTranslation = (s: number, tx: number, ty: number) => {
    'worklet';
    const maxX = ((s - 1) * width) / 2;
    const maxY = ((s - 1) * height) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  };

  const pinch = Gesture.Pinch()
    .enabled(interactive)
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale.value * event.scale));
      scale.value = nextScale;
      const clamped = clampTranslation(nextScale, translateX.value, translateY.value);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      runOnJS(commitFrame)({
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      });
    });

  const pan = Gesture.Pan()
    .enabled(interactive)
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const clamped = clampTranslation(scale.value, startX.value + event.translationX, startY.value + event.translationY);
      translateX.value = clamped.x;
      translateY.value = clamped.y;
    })
    .onEnd(() => {
      runOnJS(commitFrame)({
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      });
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const content = (
    <View style={[styles.clip, { width, height, borderRadius }]}>
      <Animated.View style={[styles.imageWrap, { width, height }, imageStyle]}>
        <Image
          contentFit="cover"
          source={source}
          style={{ width, height }}
          onLoad={() => {
            onLoad?.();
          }}
        />
      </Animated.View>
    </View>
  );

  if (!interactive) {
    return content;
  }

  return <GestureDetector gesture={composed}>{content}</GestureDetector>;
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  imageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
