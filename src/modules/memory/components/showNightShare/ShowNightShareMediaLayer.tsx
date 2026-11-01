import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

type Props = {
  source: ImageSource | null;
  fallbackSource?: ImageSource | null;
  width: number;
  height: number;
  contentPosition: ImageContentPosition;
  borderRadius?: number;
  onLoad?: () => void;
  onFallbackLoad?: () => void;
};

export function ShowNightShareMediaLayer({
  source,
  fallbackSource,
  width,
  height,
  contentPosition,
  borderRadius = 0,
  onLoad,
  onFallbackLoad,
}: Props) {
  const resolved = source ?? fallbackSource;
  const isFallback = !source && Boolean(fallbackSource);

  if (!resolved) {
    return (
      <View
        style={[styles.fallback, { width, height, borderRadius }]}
        onLayout={() => onFallbackLoad?.()}
      />
    );
  }

  return (
    <View style={[styles.clip, { width, height, borderRadius }]}>
      <Image
        contentFit="cover"
        contentPosition={contentPosition}
        source={resolved}
        style={{ width, height }}
        onLoad={() => {
          if (isFallback) onFallbackLoad?.();
          else onLoad?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: '#1A1A21',
  },
});
