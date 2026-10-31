import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import type { ShowMediaType } from '../showMediaTypes';

type ShowMediaFullscreenModalProps = {
  visible: boolean;
  assetId: string | null;
  mediaType: ShowMediaType | null;
  onClose: () => void;
};

export function ShowMediaFullscreenModal({
  visible,
  assetId,
  mediaType,
  onClose,
}: ShowMediaFullscreenModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { tokens } = useEncoreTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !assetId) {
      setUri(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(assetId);
        if (cancelled) return;
        setUri(info.localUri ?? info.uri);
      } catch {
        if (!cancelled) setUri(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId, visible]);

  const openVideo = async () => {
    if (!uri) return;
    try {
      await Linking.openURL(uri);
    } catch {
      // No system handler; thumbnail remains visible.
    }
  };

  return (
    <Modal animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <GlassIconButton accessibilityLabel={t('common.close')} icon="close" onPress={onClose} />
        </View>
        {loading ? (
          <ActivityIndicator color={tokens.onAccent} size="large" style={styles.loader} />
        ) : uri ? (
          <Pressable
            disabled={mediaType !== 'video'}
            style={styles.mediaWrap}
            onPress={() => {
              if (mediaType === 'video') void openVideo();
            }}>
            <Image contentFit="contain" source={{ uri }} style={styles.media} />
            {mediaType === 'video' ? (
              <View style={styles.playOverlay} pointerEvents="none">
                <Ionicons color="#fff" name="play-circle" size={72} />
              </View>
            ) : null}
          </Pressable>
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
  loader: {
    flex: 1,
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
  playOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
});
