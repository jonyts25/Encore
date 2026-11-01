import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton, PillButton } from '@/core/ui';
import { typography } from '@/core/ui/theme/typography';

import {
  PHOTOS_APP_REDIRECT_URI,
  photosLibraryAssetUri,
  pickPlayableVideoFileUri,
} from '../showNightLogic';
import { clearShowNightVideoCache, copyShowNightVideoToCache } from '../showNightVideoCache';
import type { ShowMediaType } from '../showMediaTypes';

type ShowMediaFullscreenModalProps = {
  visible: boolean;
  assetId: string | null;
  mediaType: ShowMediaType | null;
  onClose: () => void;
};

export type ShowNightPlaybackErrorDetail = {
  uri: string;
  message: string;
};

type ShowNightVideoPlayerProps = {
  localUri: string;
  onPlaybackError: (detail: ShowNightPlaybackErrorDetail) => void;
};

function ShowNightVideoPlayer({ localUri, onPlaybackError }: ShowNightVideoPlayerProps) {
  const player = useVideoPlayer(localUri, (instance) => {
    instance.loop = false;
  });

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error') {
      const message =
        error?.message ??
        (error ? JSON.stringify(error) : 'statusChange error without payload');
      onPlaybackError({ uri: localUri, message });
    }
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
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [playbackErrorDetail, setPlaybackErrorDetail] = useState<ShowNightPlaybackErrorDetail | null>(
    null
  );

  const handleClose = useCallback(() => {
    void clearShowNightVideoCache();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) {
      void clearShowNightVideoCache();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !assetId || mediaType !== 'video' || Platform.OS === 'web') {
      setVideoLocalUri(null);
      setVideoLoading(false);
      setVideoICloud(false);
      setVideoPlaybackError(false);
      setPlaybackErrorDetail(null);
      return;
    }

    let cancelled = false;
    setVideoLoading(true);
    setVideoLocalUri(null);
    setVideoICloud(false);
    setVideoPlaybackError(false);
    setPlaybackErrorDetail(null);

    void (async () => {
      try {
        if (Platform.OS === 'ios') {
          const peek = await MediaLibrary.getAssetInfoAsync(assetId, {
            shouldDownloadFromNetwork: false,
          });
          if (cancelled) return;
          if ((peek as { isNetworkAsset?: boolean }).isNetworkAsset) {
            setVideoICloud(true);
          }
        }

        const resolved = await MediaLibrary.getAssetInfoAsync(assetId, {
          shouldDownloadFromNetwork: true,
        });
        if (cancelled) return;

        if (__DEV__) {
          console.log('[ShowMediaFullscreenModal] getAssetInfoAsync', {
            assetId,
            uri: resolved.uri,
            localUri: resolved.localUri,
          });
        }

        const sourceUri = pickPlayableVideoFileUri(resolved.localUri, resolved.uri);
        if (!sourceUri) {
          setVideoLocalUri(null);
          return;
        }

        const cachedUri = await copyShowNightVideoToCache(sourceUri, assetId);
        if (cancelled) return;

        setVideoLocalUri(cachedUri);
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

  const openPhotosApp = () => {
    void Linking.openURL(PHOTOS_APP_REDIRECT_URI);
  };

  return (
    <Modal animationType="fade" visible={visible} onRequestClose={handleClose}>
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <GlassIconButton accessibilityLabel={t('common.close')} icon="close" onPress={handleClose} />
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
                <Text style={[typography.body, styles.loadingCopy, { color: '#fff' }]}>
                  {videoICloud ? t('showNight.videoDownloadingICloud') : t('common.loading')}
                </Text>
              </View>
            ) : videoPlaybackError ? (
              <View style={styles.errorWrap}>
                <Text style={[typography.body, styles.loadingCopy, { color: '#fff' }]}>
                  {t('showNight.videoPlaybackError')}
                </Text>
                {playbackErrorDetail ? (
                  <Text style={styles.debugError} selectable>
                    {`${playbackErrorDetail.message}\n${playbackErrorDetail.uri}`}
                  </Text>
                ) : null}
                <PillButton title={t('showNight.openInPhotos')} variant="secondary" onPress={openPhotosApp} />
              </View>
            ) : videoLocalUri ? (
              <ShowNightVideoPlayer
                localUri={videoLocalUri}
                onPlaybackError={(detail) => {
                  setPlaybackErrorDetail(detail);
                  setVideoPlaybackError(true);
                }}
              />
            ) : (
              <View style={styles.errorWrap}>
                <Text style={[typography.body, styles.loadingCopy, { color: '#fff' }]}>
                  {t('showNight.videoLoadError')}
                </Text>
                <PillButton title={t('showNight.openInPhotos')} variant="secondary" onPress={openPhotosApp} />
              </View>
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
  errorWrap: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  loadingCopy: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  debugError: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
  },
});
