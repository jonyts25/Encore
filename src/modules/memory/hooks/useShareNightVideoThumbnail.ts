import type { ImageSource } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useVideoPlayer, type VideoThumbnail } from 'expo-video';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { copyShowNightVideoToCache } from '@/modules/events/showNightVideoCache';
import { pickPlayableVideoFileUri } from '@/modules/events/showNightLogic';

import { shareNightPhUri as phUri } from '../showNightShareMediaLogic';

type State = {
  imageSource: ImageSource;
  loading: boolean;
};

export function useShareNightVideoThumbnail(
  assetId: string | null,
  timeSec: number,
  enabled: boolean
): State {
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>(() =>
    assetId ? phUri(assetId) : { uri: '' }
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !assetId || Platform.OS === 'web') {
      setFileUri(null);
      setImageSource(assetId ? phUri(assetId) : { uri: '' });
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const resolved = await MediaLibrary.getAssetInfoAsync(assetId, {
          shouldDownloadFromNetwork: true,
        });
        if (cancelled) return;
        const sourceUri = pickPlayableVideoFileUri(resolved.localUri, resolved.uri);
        if (!sourceUri) {
          setFileUri(null);
          setImageSource(phUri(assetId));
          return;
        }
        const cached = await copyShowNightVideoToCache(sourceUri, assetId);
        if (!cancelled) setFileUri(cached);
      } catch {
        if (!cancelled) {
          setFileUri(null);
          setImageSource(phUri(assetId));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled]);

  const player = useVideoPlayer(fileUri ?? '', (p) => {
    p.loop = false;
    p.muted = true;
  });

  useEffect(() => {
    if (!enabled || !assetId || !fileUri) return;

    let cancelled = false;
    void (async () => {
      try {
        const thumbs = await player.generateThumbnailsAsync(Math.max(0, timeSec));
        const thumb = thumbs[0] as VideoThumbnail | undefined;
        if (!cancelled && thumb) {
          setImageSource(thumb);
        }
      } catch {
        if (!cancelled) {
          setImageSource(phUri(assetId));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, enabled, fileUri, player, timeSec]);

  return {
    imageSource,
    loading,
  };
}
