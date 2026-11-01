import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { photosLibraryAssetUri } from '@/modules/events/showNightLogic';
import type { ShowMediaRow } from '@/modules/events/showMediaTypes';

import type { ShowNightShareMediaPick } from '../../showNightShareMediaLogic';

type Props = {
  visible: boolean;
  savedMedia: ShowMediaRow[];
  onClose: () => void;
  onPick: (pick: ShowNightShareMediaPick) => void;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 6;

export function ShowNightSharePhotoPickerSheet({ visible, savedMedia, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();

  if (!visible) return null;

  return (
    <View style={[styles.panel, { backgroundColor: tokens.surface, borderColor: tokens.separator }]}>
      <Text style={[typography.title, { color: tokens.text }]}>{t('showNightShare.changePhotoTitle')}</Text>

      <FlatList
        data={savedMedia}
        keyExtractor={(item) => item.id}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={
          <Text style={[typography.body, { color: tokens.textSecondary }]}>{t('showNightShare.changePhotoEmpty')}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.thumbWrap, { backgroundColor: tokens.background }]}
            onPress={() =>
              onPick({
                assetId: item.asset_id,
                mediaType: item.media_type === 'video' ? 'video' : 'photo',
                takenAt: item.taken_at,
              })
            }>
            <Image contentFit="cover" source={{ uri: photosLibraryAssetUri(item.asset_id) }} style={styles.thumb} />
            {item.media_type === 'video' ? (
              <View style={styles.videoBadge}>
                <Ionicons color="#fff" name="play" size={14} />
              </View>
            ) : null}
          </Pressable>
        )}
      />

      <PillButton title={t('common.close')} variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    marginTop: 12,
    maxHeight: 360,
    padding: 12,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  thumbWrap: {
    aspectRatio: 1,
    borderRadius: 8,
    flex: 1,
    overflow: 'hidden',
  },
  thumb: {
    height: '100%',
    width: '100%',
  },
  videoBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    bottom: 6,
    padding: 4,
    position: 'absolute',
    right: 6,
  },
});
