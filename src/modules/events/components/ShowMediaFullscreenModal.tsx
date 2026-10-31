import { Image } from 'expo-image';
import { Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { GlassIconButton, PillButton } from '@/core/ui';
import { typography } from '@/core/ui/theme/typography';

import { photosLibraryAssetUri } from '../showNightLogic';
import type { ShowMediaType } from '../showMediaTypes';

const PHOTOS_APP_REDIRECT = 'photos-redirect://';

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

  const uri = assetId ? photosLibraryAssetUri(assetId) : null;

  const openPhotosApp = () => {
    void Linking.openURL(PHOTOS_APP_REDIRECT).catch(() => {
      // Photos app unavailable; user can dismiss the modal.
    });
  };

  return (
    <Modal animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <GlassIconButton accessibilityLabel={t('common.close')} icon="close" onPress={onClose} />
        </View>
        {uri && mediaType === 'photo' ? (
          <View style={styles.mediaWrap}>
            <Image contentFit="contain" source={{ uri }} style={styles.media} />
          </View>
        ) : null}
        {uri && mediaType === 'video' ? (
          <View style={styles.videoWrap}>
            <Image contentFit="contain" source={{ uri }} style={styles.videoThumb} />
            <View style={styles.videoMessage}>
              <Text style={[typography.body, styles.videoCopy, { color: '#fff' }]}>
                {t('showNight.videoPlaybackComingSoon')}
              </Text>
              <PillButton
                title={t('showNight.openInPhotos')}
                variant="primary"
                onPress={openPhotosApp}
              />
            </View>
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
  videoWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  videoThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
  },
  videoMessage: {
    alignItems: 'center',
    gap: 16,
  },
  videoCopy: {
    textAlign: 'center',
  },
});
