import type { ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { ShowNightShareFrameTransform } from '../../showNightShareMediaPreference';
import { ShowNightShareFramedPhoto } from './ShowNightShareFramedPhoto';

type Props = {
  source: ImageSource | null;
  fallbackSource?: ImageSource | null;
  width: number;
  height: number;
  frame: ShowNightShareFrameTransform;
  interactive?: boolean;
  borderRadius?: number;
  onFrameChange?: (frame: ShowNightShareFrameTransform) => void;
  onLoad?: () => void;
  onFallbackLoad?: () => void;
};

export function ShowNightShareMediaLayer({
  source,
  fallbackSource,
  width,
  height,
  frame,
  interactive,
  borderRadius,
  onFrameChange,
  onLoad,
  onFallbackLoad,
}: Props) {
  const resolved = source ?? fallbackSource;

  if (!resolved) {
    return (
      <View
        style={[styles.fallback, { width, height, borderRadius }]}
        onLayout={() => onFallbackLoad?.()}
      />
    );
  }

  return (
    <ShowNightShareFramedPhoto
      borderRadius={borderRadius}
      frame={frame}
      height={height}
      interactive={interactive}
      source={resolved}
      width={width}
      onFrameChange={onFrameChange}
      onLoad={() => {
        if (source) onLoad?.();
        else onFallbackLoad?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#1A1A21',
  },
});
