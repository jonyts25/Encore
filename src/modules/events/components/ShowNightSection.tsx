import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { requestPermissionsAsync } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';

import { persistShowMediaBatch } from '../showMediaApi';
import { useShowMedia } from '../hooks/useShowMedia';
import { getShowNightSearchWindow, mapMediaLibraryType, photosLibraryAssetUri } from '../showNightLogic';
import type { Show } from '../types';
import type { ShowMediaRow, ShowMediaType } from '../showMediaTypes';

import { ShowMediaFullscreenModal } from './ShowMediaFullscreenModal';

const GRID_COLUMNS = 3;
const GRID_GAP = 6;
const PAGE_SIZE = 60;

type PickerAsset = MediaLibrary.Asset;

type ShowNightSectionProps = {
  show: Show;
};

type GalleryThumbProps = {
  row: ShowMediaRow;
  onMissing: (assetId: string) => void;
  onPress: () => void;
};

function GalleryThumb({ row, onMissing, onPress }: GalleryThumbProps) {
  const { tokens } = useEncoreTheme();

  return (
    <Pressable
      style={[styles.thumbWrap, { backgroundColor: tokens.surface }]}
      onPress={onPress}>
      <Image
        contentFit="cover"
        source={{ uri: photosLibraryAssetUri(row.asset_id) }}
        style={styles.thumb}
        onError={() => onMissing(row.asset_id)}
      />
      {row.media_type === 'video' ? (
        <View style={styles.videoBadge}>
          <Ionicons color="#fff" name="play" size={14} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function ShowNightSection({ show }: ShowNightSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { tokens } = useEncoreTheme();
  const { media, isLoading, refresh, userId } = useShowMedia(show.id, true);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerAssets, setPickerAssets] = useState<PickerAsset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingPicker, setSavingPicker] = useState(false);
  const [hiddenAssetIds, setHiddenAssetIds] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ assetId: string; mediaType: ShowMediaType } | null>(
    null
  );

  const savedAssetIds = useMemo(() => new Set(media.map((row) => row.asset_id)), [media]);

  const searchWindow = useMemo(() => getShowNightSearchWindow(show), [show]);

  const visibleMedia = useMemo(
    () => media.filter((row) => !hiddenAssetIds.has(row.asset_id)),
    [hiddenAssetIds, media]
  );

  useEffect(() => {
    setHiddenAssetIds(new Set());
  }, [media]);

  const markGalleryAssetMissing = (assetId: string) => {
    setHiddenAssetIds((prev) => {
      if (prev.has(assetId)) return prev;
      const next = new Set(prev);
      next.add(assetId);
      return next;
    });
  };

  const searchLibrary = async () => {
    if (Platform.OS === 'web') return;

    setPickerLoading(true);
    setPickerVisible(true);
    setPickerAssets([]);
    setSelectedIds(new Set());

    try {
      const permission = await requestPermissionsAsync();
      if (!permission.granted) {
        setPickerVisible(false);
        return;
      }

      if (permission.accessPrivileges === 'limited') {
        await MediaLibrary.presentPermissionsPickerAsync();
      }

      const collected: PickerAsset[] = [];
      let endCursor: string | undefined;
      let hasNext = true;

      while (hasNext && collected.length < 500) {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE_SIZE,
          after: endCursor,
          mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          createdAfter: searchWindow.createdAfter,
          createdBefore: searchWindow.createdBefore,
        });
        collected.push(...page.assets);
        hasNext = page.hasNextPage;
        endCursor = page.endCursor;
      }

      setPickerAssets(collected);
    } finally {
      setPickerLoading(false);
    }
  };

  const toggleSelection = (assetId: string) => {
    if (savedAssetIds.has(assetId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const saveSelection = async () => {
    if (!userId || selectedIds.size === 0) return;
    setSavingPicker(true);
    try {
      const payloads = pickerAssets
        .filter((asset) => selectedIds.has(asset.id))
        .map((asset) => {
          const mediaType = mapMediaLibraryType(asset.mediaType);
          return {
            show_id: show.id,
            asset_id: asset.id,
            media_type: mediaType ?? ('photo' as const),
            taken_at: new Date(asset.creationTime).toISOString(),
            source: 'library' as const,
          };
        })
        .filter((p) => p.media_type === 'photo' || p.media_type === 'video');

      await persistShowMediaBatch(userId, payloads);
      setPickerVisible(false);
      setSelectedIds(new Set());
      await refresh();
    } finally {
      setSavingPicker(false);
    }
  };

  const countLabel =
    visibleMedia.length > 0
      ? t('showNight.count', { count: visibleMedia.length })
      : null;

  return (
    <View style={styles.section}>
      <Text style={[typography.title, { color: tokens.text }]}>{t('showNight.title')}</Text>

      <View style={styles.actionRow}>
        <PillButton
          title={t('showNight.searchLibrary')}
          variant="secondary"
          onPress={() => void searchLibrary()}
        />
        <PillButton
          title={t('showNight.shareCta')}
          variant="secondary"
          onPress={() => router.push(`/show/${show.id}/share-night`)}
        />
      </View>

      {isLoading ? <ActivityIndicator color={tokens.accent} style={styles.loader} /> : null}

      {countLabel ? (
        <Text style={[typography.secondary, { color: tokens.textSecondary }]}>{countLabel}</Text>
      ) : null}

      {visibleMedia.length > 0 ? (
        <FlatList
          data={visibleMedia}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          scrollEnabled={false}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <GalleryThumb
              row={item}
              onMissing={markGalleryAssetMissing}
              onPress={() =>
                setViewer({ assetId: item.asset_id, mediaType: item.media_type })
              }
            />
          )}
        />
      ) : null}

      {pickerVisible ? (
        <View style={[styles.pickerPanel, { backgroundColor: tokens.surface, borderColor: tokens.separator }]}>
          {pickerLoading ? (
            <ActivityIndicator color={tokens.accent} />
          ) : pickerAssets.length === 0 ? (
            <Text style={[typography.body, { color: tokens.textSecondary }]}>
              {t('showNight.emptySearch')}
            </Text>
          ) : (
            <>
              <FlatList
                data={pickerAssets}
                keyExtractor={(item) => item.id}
                numColumns={GRID_COLUMNS}
                columnWrapperStyle={styles.gridRow}
                renderItem={({ item }) => {
                  const saved = savedAssetIds.has(item.id);
                  const selected = saved || selectedIds.has(item.id);
                  return (
                    <Pressable
                      style={[styles.thumbWrap, { backgroundColor: tokens.background }]}
                      onPress={() => toggleSelection(item.id)}>
                      <Image contentFit="cover" source={{ uri: item.uri }} style={styles.thumb} />
                      {item.mediaType === MediaLibrary.MediaType.video ? (
                        <View style={styles.videoBadge}>
                          <Ionicons color="#fff" name="play" size={14} />
                        </View>
                      ) : null}
                      {selected ? (
                        <View style={[styles.checkBadge, { backgroundColor: tokens.accent }]}>
                          <Ionicons color={tokens.onAccent} name="checkmark" size={16} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
              <View style={styles.pickerActions}>
                <PillButton
                  title={t('common.close')}
                  variant="secondary"
                  onPress={() => setPickerVisible(false)}
                />
                <PillButton
                  disabled={selectedIds.size === 0 || savingPicker}
                  title={t('showNight.save')}
                  variant="primary"
                  onPress={() => void saveSelection()}
                />
              </View>
            </>
          )}
        </View>
      ) : null}

      <ShowMediaFullscreenModal
        assetId={viewer?.assetId ?? null}
        mediaType={viewer?.mediaType ?? null}
        visible={viewer != null}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loader: {
    marginVertical: 8,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  thumbWrap: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    padding: 4,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 12,
    padding: 2,
  },
  pickerPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
});
