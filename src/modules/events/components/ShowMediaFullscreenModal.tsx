import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton } from '@/core/ui';
import { typography } from '@/core/ui/theme/typography';

import { photosLibraryAssetUri } from '../showNightLogic';
import type { ShowMediaType } from '../showMediaTypes';

type ShowMediaFullscreenModalProps = {
  visible: boolean;
  assetId: string | null;
  mediaType: ShowMediaType | null;
  onClose: () => void;
};

function ShowNightVideoPlayer({ localUri }: { localUri: string }) {
  const player = useVideoPlayer(localUri, (instance) => {
    instance.loop = false;
  });

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="contain"
      nativeControls
    />
  );
}

export function ShowMediaFullscreenModal({
  visible,
  assetId,
  mediaType,
  onClose,
}: ShowMediaFullscreenModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const photoUri = assetId && mediaType === 'photo' ? photosLibraryAssetUri(assetId) : null;

  const [videoLocalUri, setVideoLocalUri] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoICloud, setVideoICloud] = useState(false);

  useEffect(() => {
    if (!visible || !assetId || mediaType !== 'video' || Platform.OS === 'web') {
      setVideoLocalUri(null);
      setVideoLoading(false);
      setVideoICloud(false);
      return;
    }

    let cancelled = false;
    setVideoLoading(true);
    setVideoLocalUri(null);
    setVideoICloud(false);

    void (async () => {
      try {
        const peek = await MediaLibrary.getAssetInfoAsync(assetId, {
          shouldDownloadFromNetwork: false,
        });
        if (cancelled) return;

        const networkAsset =
          Platform.OS === 'ios' &&
          Boolean((peek as { isNetworkAsset?: boolean }).isNetworkAsset);

        if (networkAsset) {
          setVideoICloud(true);
        }

        const resolved = await MediaLibrary.getAssetInfoAsync(assetId);
        if (cancelled) return;

        const playable = resolved.localUri ?? resolved.uri;
        setVideoLocalUri(playable);
        setVideoICloud(false);
      } catch {
        if (!cancelled) {
          setVideoLocalUri(null);
        }
      } finally {
        if (!cancelled) {
          setVideoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, mediaType, visible]);

  return (
    <Modal animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <GlassIconButton accessibilityLabel={t('common.close')} icon="close" onPress={onClose} />
        </View>
        {photoUri ? (
          <View style={styles.mediaWrap}>
            <Image contentFit="contain" source={{ uri: photoUri }} style={styles.media} />
          </View>
        ) : null}
        {visible && mediaType === 'video' ? (
          <View style={styles.mediaWrap}>
            {videoLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#fff" size="large" />
                {videoICloud ? (
                  <Text style={[typography.body, styles.loadingCopy, { color: '#fff' }]}>
                    {t('showNight.videoDownloadingICloud')}
                  </Text>
                ) : null}
              </View>
            ) : videoLocalUri ? (
              <ShowNightVideoPlayer localUri={videoLocalUri} />
            ) : (
              <Text style={[typography.body, styles.loadingCopy, { color: '#fff' }]}>
                {t('showNight.videoLoadError')}
              </Text>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    zIndex: 2,
  },
  mediaWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  loadingWrap: {
    alignItems: 'center',
    gap: 16,
  },
  loadingCopy: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
