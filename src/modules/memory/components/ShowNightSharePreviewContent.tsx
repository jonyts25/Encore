import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { queryKeys } from '@/core/query';
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { fetchShowById } from '@/modules/events/api';
import { useShowMedia } from '@/modules/events/hooks/useShowMedia';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { canToggleHighlight } from '../memoryHighlightLogic';
import { setMemorySongHighlight } from '../memoryApi';
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
  defaultShowNightShareContentAnchor,
  readShowNightShareMediaPrefs,
  showNightShareContentPosition,
  writeShowNightShareMediaPrefs,
  type ShowNightShareContentAnchor,
  type ShowNightShareMediaPrefs,
} from '../showNightShareMediaPreference';
import { pickDefaultShareNightMedia, shareNightPhUri, type ShowNightShareMediaPick } from '../showNightShareMediaLogic';
import {
  readLastShowNightShareTemplate,
  writeLastShowNightShareTemplate,
} from '../showNightShareTemplatePreference';
import {
  bumpShowNightShareCaptureVersion,
  captureAndShareShowNightCard,
  captureShowNightCardForSave,
  waitForShareCardBackgroundReady,
} from '../shareShowNightImage';
import { ShowNightShareCard } from './ShowNightShareCard';
import { ShowNightShareFramingControl } from './showNightShare/ShowNightShareFramingControl';
import { ShowNightSharePhotoPickerSheet } from './showNightShare/ShowNightSharePhotoPickerSheet';

function resolveInitialTemplateIndex(
  templates: ShowNightShareTemplateId[],
  preferred: ShowNightShareTemplateId | null
): number {
  if (preferred && templates.includes(preferred)) {
    return templates.indexOf(preferred);
  }
  return 0;
}

function buildDefaultPrefs(pick: ShowNightShareMediaPick): ShowNightShareMediaPrefs {
  return {
    assetId: pick.assetId,
    mediaType: pick.mediaType,
    contentAnchor: defaultShowNightShareContentAnchor(),
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
  const mediaLoadGateRef = useRef<(() => void) | null>(null);

  const { loaded: fontsLoaded, error: fontsError } = useShowNightShareFonts();

  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaPrefs, setMediaPrefs] = useState<ShowNightShareMediaPrefs | null>(null);
  const [captureMounted, setCaptureMounted] = useState(false);

  const showQuery = useQuery({
    queryKey: ['show', showId],
    queryFn: () => fetchShowById(showId!),
    enabled: Boolean(showId),
  });

  const { memory, isLoading: memoryLoading, userId } = useShowMemory(showId ?? '', Boolean(showId));
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
  const contentPosition = showNightShareContentPosition(
    mediaPrefs?.contentAnchor ?? defaultShowNightShareContentAnchor()
  );

  const mediaSource = useMemo(() => {
    if (!mediaPrefs) return null;
    return shareNightPhUri(mediaPrefs.assetId);
  }, [mediaPrefs]);

  useEffect(() => {
    if (!showId) return;
    const saved = readShowNightShareMediaPrefs(showId);
    const defaultPick = pickDefaultShareNightMedia(media);
    setMediaPrefs(saved ?? (defaultPick ? buildDefaultPrefs(defaultPick) : null));
  }, [media, showId]);

  useEffect(() => {
    if (!model) return;
    const preferred = readLastShowNightShareTemplate();
    const index = resolveInitialTemplateIndex(templates, preferred);
    setActiveIndex(index);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * previewWidth, animated: false });
    });
  }, [model?.showId, previewWidth, templates.join(',')]);

  useEffect(() => {
    if (fontsError) {
      console.error('[ShowNightShare] fonts failed', fontsError);
    }
  }, [fontsError]);

  const persistMediaPrefs = useCallback(
    (next: ShowNightShareMediaPrefs) => {
      if (!showId) return;
      setMediaPrefs(next);
      writeShowNightShareMediaPrefs(showId, next);
      bumpShowNightShareCaptureVersion();
    },
    [showId]
  );

  const onPickMedia = useCallback(
    (pick: ShowNightShareMediaPick) => {
      persistMediaPrefs({
        assetId: pick.assetId,
        mediaType: pick.mediaType,
        contentAnchor: mediaPrefs?.contentAnchor ?? defaultShowNightShareContentAnchor(),
      });
      setPickerOpen(false);
    },
    [mediaPrefs?.contentAnchor, persistMediaPrefs]
  );

  const onFramingChange = useCallback(
    (anchor: ShowNightShareContentAnchor) => {
      if (!mediaPrefs) return;
      persistMediaPrefs({ ...mediaPrefs, contentAnchor: anchor });
    },
    [mediaPrefs, persistMediaPrefs]
  );

  const onToggleHighlight = useCallback(
    async (songId: string) => {
      if (!userId || !showId) return;
      const cached =
        queryClient.getQueryData<typeof memory>(queryKeys.memory(showId, userId)) ?? memory;
      if (!cached) return;
      const target = cached.songs.find((song) => song.song_id === songId);
      if (!target) return;

      const nextHighlight = !target.is_highlight;
      if (!canToggleHighlight(cached, songId, nextHighlight)) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const updated = await setMemorySongHighlight(userId, cached, showId, songId, nextHighlight);
        queryClient.setQueryData(queryKeys.memory(showId, userId), updated);
        bumpShowNightShareCaptureVersion();
      } catch (error) {
        if (__DEV__) {
          console.error('[ShowNightShare] highlight update failed', error);
        }
        Alert.alert(t('showNightShare.shareError'));
      }
    },
    [memory, queryClient, showId, t, userId]
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / previewWidth);
      const clamped = Math.max(0, Math.min(index, templates.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
        bumpShowNightShareCaptureVersion();
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

  const beginMediaLoadWait = useCallback(() => {
    return new Promise<void>((resolve) => {
      mediaLoadGateRef.current = resolve;
    });
  }, []);

  const onMediaLoad = useCallback(() => {
    mediaLoadGateRef.current?.();
    mediaLoadGateRef.current = null;
  }, []);

  const runCaptureAction = useCallback(
    async (action: 'share' | 'save') => {
      if (!showId) return;
      const setBusy = action === 'share' ? setSharing : setSaving;
      setBusy(true);
      setCaptureMounted(true);

      try {
        const needsMedia = activeTemplate !== 'setlist';
        const mediaWait = needsMedia ? beginMediaLoadWait() : Promise.resolve();

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

        await waitForShareCardBackgroundReady(() => mediaWait, 3000);

        if (action === 'share') {
          await captureAndShareShowNightCard(captureRef, showId, activeTemplate);
        } else {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(t('showNightShare.savePhotosPermissionDenied'));
            return;
          }
          const uri = await captureShowNightCardForSave(captureRef, showId, activeTemplate);
          await MediaLibrary.saveToLibraryAsync(uri);
          Alert.alert(t('showNightShare.savedToPhotos'));
        }
      } catch (error) {
        reportError(error);
      } finally {
        setCaptureMounted(false);
        setBusy(false);
        mediaLoadGateRef.current = null;
      }
    },
    [activeTemplate, beginMediaLoadWait, reportError, showId, t]
  );

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
          extraData={activeTemplate}
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
            const isActive = item === activeTemplate;
            if (!isActive) {
              return (
                <View
                  style={[
                    styles.previewPlaceholder,
                    { width: previewWidth, height: previewHeight, backgroundColor: tokens.surface },
                  ]}
                />
              );
            }

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
                    contentPosition={contentPosition}
                    fontsReady={fontsLoaded}
                    mediaSource={mediaSource}
                    model={model}
                    template={item}
                    onMediaLoad={onMediaLoad}
                    onToggleHighlight={item === 'setlist' ? (songId) => void onToggleHighlight(songId) : undefined}
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
          <>
            <PillButton
              title={t('showNightShare.changePhoto')}
              variant="secondary"
              onPress={() => setPickerOpen(true)}
            />
            {mediaPrefs ? (
              <ShowNightShareFramingControl value={mediaPrefs.contentAnchor} onChange={onFramingChange} />
            ) : null}
          </>
        ) : null}

        <ShowNightSharePhotoPickerSheet
          savedMedia={media}
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPick={onPickMedia}
        />
      </View>

      {captureMounted ? (
        <View
          ref={captureRef}
          collapsable={false}
          pointerEvents="none"
          style={styles.offscreenCapture}>
          <ShowNightShareCard
            contentPosition={contentPosition}
            fontsReady={fontsLoaded}
            mediaSource={mediaSource}
            model={model}
            template={activeTemplate}
            onMediaLoad={onMediaLoad}
          />
        </View>
      ) : null}

      <View style={[styles.actions, { paddingHorizontal: 16 }]}>
        <PillButton title={t('common.back')} variant="secondary" onPress={() => router.back()} />
        <PillButton
          disabled={saving}
          title={saving ? t('common.loading') : t('showNightShare.saveToPhotos')}
          variant="secondary"
          onPress={() => void runCaptureAction('save')}
        />
        <PillButton
          disabled={sharing}
          title={sharing ? t('common.loading') : t('showNightShare.shareAction')}
          variant="primary"
          onPress={() => void runCaptureAction('share')}
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
  previewPlaceholder: {
    borderRadius: 8,
    opacity: 0.35,
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
