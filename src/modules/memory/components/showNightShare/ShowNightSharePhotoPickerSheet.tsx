import { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library/legacy';
import { requestPermissionsAsync } from 'expo-media-library';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import type { ShowNightLibraryAsset } from '@/modules/events/showNightLibrarySearch';
import { fetchShowNightLibraryAssets } from '@/modules/events/showNightLibrarySearch';
import { photosLibraryAssetUri } from '@/modules/events/showNightLogic';
import type { Show } from '@/modules/events/types';
import type { ShowMediaRow } from '@/modules/events/showMediaTypes';

import type { ShowNightShareMediaPick } from '../../showNightShareMediaLogic';
import { mapMediaLibraryType } from '@/modules/events/showNightLogic';

type Props = {
  visible: boolean;
  show: Show;
  savedMedia: ShowMediaRow[];
  onClose: () => void;
  onPick: (pick: ShowNightShareMediaPick) => void;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 6;

export function ShowNightSharePhotoPickerSheet({
  visible,
  show,
  savedMedia,
  onClose,
  onPick,
}: Props) {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();

  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<ShowNightLibraryAsset[]>([]);
  const [libraryVisible, setLibraryVisible] = useState(false);

  if (!visible) return null;

  const onSearchLibrary = async () => {
    if (Platform.OS === 'web') return;
    setLibraryLoading(true);
    setLibraryVisible(true);
    setLibraryAssets([]);
    try {
      const permission = await requestPermissionsAsync();
      if (!permission.granted) {
        setLibraryVisible(false);
        return;
      }
      if (permission.accessPrivileges === 'limited') {
        await MediaLibrary.presentPermissionsPickerAsync();
      }
      const assets = await fetchShowNightLibraryAssets(show);
      setLibraryAssets(assets);
    } finally {
      setLibraryLoading(false);
    }
  };

  const renderSavedItem = ({ item }: { item: ShowMediaRow }) => (
    <Pressable
      style={[styles.thumbWrap, { backgroundColor: tokens.surface }]}
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
  );

  const renderLibraryItem = ({ item }: { item: ShowNightLibraryAsset }) => {
    const mapped = mapMediaLibraryType(item.mediaType);
    if (!mapped) return null;
    return (
      <Pressable
        style={[styles.thumbWrap, { backgroundColor: tokens.surface }]}
        onPress={() =>
          onPick({
            assetId: item.id,
            mediaType: mapped,
            takenAt: new Date(item.creationTime).toISOString(),
          })
        }>
        <Image contentFit="cover" source={{ uri: item.uri }} style={styles.thumb} />
        {item.mediaType === MediaLibrary.MediaType.video ? (
          <View style={styles.videoBadge}>
            <Ionicons color="#fff" name="play" size={14} />
          </View>
        ) : null}
      </Pressable>
    );
  };

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
        renderItem={renderSavedItem}
      />

      <PillButton title={t('showNight.searchLibrary')} variant="secondary" onPress={() => void onSearchLibrary()} />

      {libraryVisible ? (
        libraryLoading ? (
          <ActivityIndicator color={tokens.accent} />
        ) : (
          <FlatList
            data={libraryAssets}
            keyExtractor={(item) => item.id}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.gridRow}
            ListEmptyComponent={
              <Text style={[typography.body, { color: tokens.textSecondary }]}>{t('showNight.emptySearch')}</Text>
            }
            renderItem={renderLibraryItem}
          />
        )
      ) : null}

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
    maxHeight: 420,
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
