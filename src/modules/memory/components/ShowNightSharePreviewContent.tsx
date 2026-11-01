import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ImageSource } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { fetchShowById } from '@/modules/events/api';
import { useShowMedia } from '@/modules/events/hooks/useShowMedia';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useShareNightVideoThumbnail } from '../hooks/useShareNightVideoThumbnail';
import { persistShowMemory } from '../memoryApi';
import { useShowMemory } from '../hooks/useShowMemory';
import {
  availableShowNightShareTemplates,
  buildShowNightShareCardModel,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareTemplateId,
} from '../showNightShareCardLogic';
import { useShowNightShareFonts } from '../showNightShareFonts';
import {
  defaultShowNightShareFrame,
  readShowNightShareMediaSelection,
  writeShowNightShareMediaSelection,
  type ShowNightShareMediaSelection,
} from '../showNightShareMediaPreference';
import {
  pickDefaultShareNightMedia,
  shareNightPhUri,
  type ShowNightShareMediaPick,
} from '../showNightShareMediaLogic';
import {
  readLastShowNightShareTemplate,
  writeLastShowNightShareTemplate,
} from '../showNightShareTemplatePreference';
import {
  captureAndShareShowNightCard,
  captureShowNightCardForSave,
  invalidateShowNightShareSessionCapture,
} from '../shareShowNightImage';
import { ShowNightShareCard } from './ShowNightShareCard';
import { ShowNightSharePhotoPickerSheet } from './showNightShare/ShowNightSharePhotoPickerSheet';
import { ShowNightShareVideoFrameSlider } from './showNightShare/ShowNightShareVideoFrameSlider';

function resolveInitialTemplateIndex(
  templates: ShowNightShareTemplateId[],
  preferred: ShowNightShareTemplateId | null
): number {
  if (preferred && templates.includes(preferred)) {
    return templates.indexOf(preferred);
  }
  return 0;
}

function buildDefaultSelection(media: ShowNightShareMediaPick | null): ShowNightShareMediaSelection | null {
  if (!media) return null;
  return {
    assetId: media.assetId,
    mediaType: media.mediaType,
    videoTimeSec: 0,
    frame: defaultShowNightShareFrame(),
  };
}

export function ShowNightSharePreviewContent() {
  const { id: showId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { tokens } = useEncoreTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const captureRef = useRef<View>(null);
  const listRef = useRef<FlatList<ShowNightShareTemplateId>>(null);
  const queryClient = useQueryClient();

  const { loaded: fontsLoaded, error: fontsError } = useShowNightShareFonts();

  const [readyByTemplate, setReadyByTemplate] = useState<Partial<Record<ShowNightShareTemplateId, boolean>>>({});
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectionByTemplate, setSelectionByTemplate] = useState<
    Partial<Record<ShowNightShareTemplateId, ShowNightShareMediaSelection>>
  >({});
  const [videoDurationSec, setVideoDurationSec] = useState(30);

  const showQuery = useQuery({
    queryKey: ['show', showId],
    queryFn: () => fetchShowById(showId!),
    enabled: Boolean(showId),
  });

  const { memory, isLoading: memoryLoading, refresh: refreshMemory, userId } = useShowMemory(
    showId ?? '',
    Boolean(showId)
  );
  const { media, isLoading: mediaLoading } = useShowMedia(showId ?? '', Boolean(showId));
  const { prediction, isLoading: predictionLoading } = useShowPrediction(showId ?? '', {
    enabled: Boolean(showId),
  });

  const show = showQuery.data;
  const loading = showQuery.isPending || memoryLoading || mediaLoading || predictionLoading;

  const model = useMemo(() => {
    if (!show) return null;
    return buildShowNightShareCardModel(show, memory, media, prediction, i18n.language);
  }, [show, memory, media, prediction, i18n.language]);

  const previewWidth = windowWidth - 32;
  const previewHeight = (previewWidth * SHARE_CARD_HEIGHT) / SHARE_CARD_WIDTH;
  const previewScale = previewWidth / SHARE_CARD_WIDTH;

  const templates = useMemo(() => {
    if (!model) return ['boleto', 'poster'] as ShowNightShareTemplateId[];
    return availableShowNightShareTemplates(model);
  }, [model]);

  const activeTemplate = templates[activeIndex] ?? templates[0] ?? 'boleto';
  const activeSelection = selectionByTemplate[activeTemplate] ?? null;

  useEffect(() => {
    if (!showId || !model) return;
    const defaultPick = pickDefaultShareNightMedia(media);
    const defaultSelection = buildDefaultSelection(defaultPick);
    const next: Partial<Record<ShowNightShareTemplateId, ShowNightShareMediaSelection>> = {};
    for (const template of templates) {
      next[template] =
        readShowNightShareMediaSelection(showId, template) ??
        defaultSelection ??
        undefined;
    }
    setSelectionByTemplate(next);
  }, [media, model, showId, templates.join(',')]);

  useEffect(() => {
    if (!model) return;
    const preferred = readLastShowNightShareTemplate();
    const index = resolveInitialTemplateIndex(templates, preferred);
    setActiveIndex(index);
    setReadyByTemplate({});
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * previewWidth, animated: false });
    });
  }, [model?.showId, previewWidth, templates.join(',')]);

  useEffect(() => {
    setReadyByTemplate((prev) => ({ ...prev, [activeTemplate]: false }));
    if (showId) {
      invalidateShowNightShareSessionCapture(showId, activeTemplate);
    }
  }, [activeSelection?.assetId, activeSelection?.videoTimeSec, activeSelection?.frame, activeTemplate, showId]);

  useEffect(() => {
    if (fontsError) {
      console.error('[ShowNightShare] fonts failed', fontsError);
    }
  }, [fontsError]);

  const { imageSource: videoThumbSource } = useShareNightVideoThumbnail(
    activeSelection?.mediaType === 'video' ? activeSelection.assetId : null,
    activeSelection?.videoTimeSec ?? 0,
    activeSelection?.mediaType === 'video'
  );

  useEffect(() => {
    if (activeSelection?.mediaType !== 'video' || !activeSelection.assetId) return;
    void MediaLibrary.getAssetInfoAsync(activeSelection.assetId).then((info) => {
      const duration = typeof info.duration === 'number' ? info.duration : 30;
      setVideoDurationSec(Math.max(1, duration));
    });
  }, [activeSelection?.assetId, activeSelection?.mediaType]);

  const mediaSourceForTemplate = useCallback(
    (template: ShowNightShareTemplateId): ImageSource | null => {
      if (template === 'setlist') return null;
      const selection = selectionByTemplate[template];
      if (!selection) return null;
      if (selection.mediaType === 'video') {
        if (template === activeTemplate) return videoThumbSource;
        return shareNightPhUri(selection.assetId);
      }
      return shareNightPhUri(selection.assetId);
    },
    [activeTemplate, selectionByTemplate, videoThumbSource]
  );

  const markTemplateReady = useCallback((template: ShowNightShareTemplateId) => {
    setReadyByTemplate((prev) => ({ ...prev, [template]: true }));
  }, []);

  const visualReady = Boolean(readyByTemplate[activeTemplate]);

  const persistSelection = useCallback(
    (template: ShowNightShareTemplateId, selection: ShowNightShareMediaSelection) => {
      if (!showId) return;
      setSelectionByTemplate((prev) => ({ ...prev, [template]: selection }));
      writeShowNightShareMediaSelection(showId, template, selection);
    },
    [showId]
  );

  const onPickMedia = useCallback(
    (pick: ShowNightShareMediaPick) => {
      const next: ShowNightShareMediaSelection = {
        assetId: pick.assetId,
        mediaType: pick.mediaType,
        videoTimeSec: 0,
        frame: defaultShowNightShareFrame(),
      };
      persistSelection(activeTemplate, next);
      setPickerOpen(false);
    },
    [activeTemplate, persistSelection]
  );

  const onFrameChange = useCallback(
    (frame: ShowNightShareMediaSelection['frame']) => {
      if (!activeSelection) return;
      persistSelection(activeTemplate, { ...activeSelection, frame });
    },
    [activeSelection, activeTemplate, persistSelection]
  );

  const onVideoTimeChange = useCallback(
    (sec: number) => {
      if (!activeSelection || activeSelection.mediaType !== 'video') return;
      persistSelection(activeTemplate, { ...activeSelection, videoTimeSec: sec });
    },
    [activeSelection, activeTemplate, persistSelection]
  );

  const onToggleHighlight = useCallback(
    async (songId: string) => {
      if (!memory || !userId || !showId) return;
      const target = memory.songs.find((song) => song.song_id === songId);
      if (!target) return;

      const highlightCount = memory.songs.filter((song) => song.is_highlight).length;
      const nextHighlight = !target.is_highlight;
      if (nextHighlight && highlightCount >= 3) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const songs = memory.songs.map((song) => ({
        song_id: song.song_id,
        position: song.position,
        is_encore: song.is_encore,
        is_highlight: song.song_id === songId ? nextHighlight : song.is_highlight,
      }));

      await persistShowMemory(userId, {
        show_id: showId,
        rating: memory.rating,
        note: memory.note,
        setlist_confirmed_at: memory.setlist_confirmed_at,
        songs,
      });
      await refreshMemory();
      void queryClient.invalidateQueries({ queryKey: ['memory', showId, userId] });
      if (showId) {
        invalidateShowNightShareSessionCapture(showId, 'setlist');
      }
    },
    [memory, queryClient, refreshMemory, showId, userId]
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
      const clamped = Math.max(0, Math.min(index, templates.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
        const template = templates[clamped];
        if (template) {
          writeLastShowNightShareTemplate(template);
        }
      }
    },
    [activeIndex, previewWidth, templates]
  );

  const reportError = useCallback(
    (error: unknown) => {
      if (__DEV__) {
        console.error('[ShowNightShare] action failed', error);
        const message = error instanceof Error ? error.message : String(error);
        Alert.alert(t('showNightShare.shareError'), message);
        return;
      }
      Alert.alert(t('showNightShare.shareError'));
    },
    [t]
  );

  const onShare = useCallback(async () => {
    if (!visualReady || sharing || !showId) return;
    setSharing(true);
    try {
      await captureAndShareShowNightCard(captureRef, showId, activeTemplate);
    } catch (error) {
      reportError(error);
    } finally {
      setSharing(false);
    }
  }, [activeTemplate, reportError, sharing, showId, visualReady]);

  const onSaveToPhotos = useCallback(async () => {
    if (!visualReady || saving || !showId) return;
    setSaving(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('showNightShare.savePhotosPermissionDenied'));
        return;
      }
      const uri = await captureShowNightCardForSave(captureRef, showId, activeTemplate);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('showNightShare.savedToPhotos'));
    } catch (error) {
      reportError(error);
    } finally {
      setSaving(false);
    }
  }, [activeTemplate, reportError, saving, showId, t, visualReady]);

  if (!showId) {
    return null;
  }

  if (!fontsLoaded || (loading && !show)) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  if (!show || !model) {
    return (
      <View style={[styles.centered, { backgroundColor: tokens.background }]}>
        <Text style={{ color: tokens.textSecondary }}>{t('events.showNotFound')}</Text>
        <PillButton title={t('common.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const captureSelection = selectionByTemplate[activeTemplate];
  const captureMediaSource: ImageSource | null =
    activeTemplate === 'setlist'
      ? null
      : captureSelection?.mediaType === 'video'
        ? videoThumbSource
        : captureSelection
          ? shareNightPhUri(captureSelection.assetId)
          : null;

  return (
    <View style={[styles.screen, { backgroundColor: tokens.background, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.content}>
        <Text style={[typography.body, styles.hint, { color: tokens.textSecondary }]}>
          {t('showNightShare.previewHint')}
        </Text>

        {activeTemplate === 'setlist' ? (
          <Text style={[typography.footnote, styles.setlistHint, { color: tokens.textSecondary }]}>
            {t('showNightShare.setlist.highlightHint')}
          </Text>
        ) : null}

        <FlatList
          ref={listRef}
          data={templates}
          horizontal
          keyExtractor={(item) => item}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ width: previewWidth }}
          getItemLayout={(_, index) => ({
            length: previewWidth,
            offset: previewWidth * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => {
            const selection = selectionByTemplate[item];
            const mediaSource = mediaSourceForTemplate(item);
            return (
              <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
                <View
                  style={{
                    width: SHARE_CARD_WIDTH,
                    height: SHARE_CARD_HEIGHT,
                    transform: [{ scale: previewScale }],
                    transformOrigin: 'top left',
                  }}>
                  <ShowNightShareCard
                    mediaSource={mediaSource}
                    fontsReady={fontsLoaded}
                    frame={selection?.frame ?? defaultShowNightShareFrame()}
                    interactive
                    model={model}
                    template={item}
                    onFrameChange={(frame) => {
                      if (!selection) return;
                      persistSelection(item, { ...selection, frame });
                    }}
                    onToggleHighlight={item === 'setlist' ? (songId) => void onToggleHighlight(songId) : undefined}
                    onVisualReady={() => markTemplateReady(item)}
                  />
                </View>
              </View>
            );
          }}
        />

        <View style={styles.dots}>
          {templates.map((template, index) => (
            <View
              key={template}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? tokens.accent : tokens.textSecondary,
                  opacity: index === activeIndex ? 1 : 0.35,
                },
              ]}
            />
          ))}
        </View>

        {activeTemplate !== 'setlist' ? (
          <PillButton
            title={t('showNightShare.changePhoto')}
            variant="secondary"
            onPress={() => setPickerOpen(true)}
          />
        ) : null}

        {activeSelection?.mediaType === 'video' && activeTemplate !== 'setlist' ? (
          <ShowNightShareVideoFrameSlider
            durationSec={videoDurationSec}
            valueSec={activeSelection.videoTimeSec}
            onChange={onVideoTimeChange}
          />
        ) : null}

        <ShowNightSharePhotoPickerSheet
          savedMedia={media}
          show={show}
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={onPickMedia}
        />

        {!visualReady ? <ActivityIndicator color={tokens.accent} style={styles.loader} /> : null}
      </View>

      <View
        ref={captureRef}
        collapsable={false}
        pointerEvents="none"
        style={styles.offscreenCapture}>
        <ShowNightShareCard
          mediaSource={captureMediaSource}
          fontsReady={fontsLoaded}
          frame={captureSelection?.frame ?? defaultShowNightShareFrame()}
          interactive={false}
          model={model}
          template={activeTemplate}
          onVisualReady={() => markTemplateReady(activeTemplate)}
        />
      </View>

      <View style={[styles.actions, { paddingHorizontal: 16 }]}>
        <PillButton title={t('common.back')} variant="secondary" onPress={() => router.back()} />
        <PillButton
          disabled={!visualReady || saving}
          title={saving ? t('common.loading') : t('showNightShare.saveToPhotos')}
          variant="secondary"
          onPress={() => void onSaveToPhotos()}
        />
        <PillButton
          disabled={!visualReady || sharing}
          title={sharing ? t('common.loading') : t('showNightShare.shareAction')}
          variant="primary"
          onPress={() => void onShare()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hint: {
    marginBottom: 8,
    textAlign: 'center',
  },
  setlistHint: {
    marginBottom: 12,
    textAlign: 'center',
  },
  previewFrame: {
    overflow: 'hidden',
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
  },
  dot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  offscreenCapture: {
    height: SHARE_CARD_HEIGHT,
    left: -10000,
    position: 'absolute',
    top: 0,
    width: SHARE_CARD_WIDTH,
  },
  loader: {
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
});
