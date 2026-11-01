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
import { PillButton } from '@/core/ui';
import { useEncoreTheme } from '@/core/ui/theme';
import { typography } from '@/core/ui/theme/typography';
import { fetchShowById } from '@/modules/events/api';
import { useShowMedia } from '@/modules/events/hooks/useShowMedia';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import { useQuery } from '@tanstack/react-query';

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
  readLastShowNightShareTemplate,
  writeLastShowNightShareTemplate,
} from '../showNightShareTemplatePreference';
import {
  captureAndShareShowNightCard,
  captureShowNightCardForSave,
  invalidateShowNightShareSessionCapture,
} from '../shareShowNightImage';
import { ShowNightShareCard } from './ShowNightShareCard';

function resolveInitialTemplateIndex(
  templates: ShowNightShareTemplateId[],
  preferred: ShowNightShareTemplateId | null
): number {
  if (preferred && templates.includes(preferred)) {
    return templates.indexOf(preferred);
  }
  return 0;
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

  const { loaded: fontsLoaded, error: fontsError } = useShowNightShareFonts();

  const [visualReady, setVisualReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const showQuery = useQuery({
    queryKey: ['show', showId],
    queryFn: () => fetchShowById(showId!),
    enabled: Boolean(showId),
  });

  const { memory, isLoading: memoryLoading } = useShowMemory(showId ?? '', Boolean(showId));
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

  useEffect(() => {
    if (!model) return;
    const preferred = readLastShowNightShareTemplate();
    const index = resolveInitialTemplateIndex(templates, preferred);
    setActiveIndex(index);
    setCaptureTemplate(templates[index] ?? 'boleto');
    setVisualReady(false);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: index * previewWidth, animated: false });
    });
  }, [model?.showId, previewWidth, templates.join(',')]);

  useEffect(() => {
    setCaptureTemplate(activeTemplate);
    setVisualReady(false);
    if (showId) {
      invalidateShowNightShareSessionCapture(showId, activeTemplate);
    }
  }, [activeTemplate, showId]);

  useEffect(() => {
    if (fontsError) {
      console.error('[ShowNightShare] fonts failed', fontsError);
    }
  }, [fontsError]);

  const onVisualReady = useCallback(() => {
    setVisualReady(true);
  }, []);

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

  return (
    <View style={[styles.screen, { backgroundColor: tokens.background, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.content}>
        <Text style={[typography.body, styles.hint, { color: tokens.textSecondary }]}>
          {t('showNightShare.previewHint')}
        </Text>

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
          renderItem={({ item, index }) => (
            <View style={[styles.previewFrame, { width: previewWidth, height: previewHeight }]}>
              <View
                style={{
                  width: SHARE_CARD_WIDTH,
                  height: SHARE_CARD_HEIGHT,
                  transform: [{ scale: previewScale }],
                  transformOrigin: 'top left',
                }}>
                <ShowNightShareCard model={model} template={item} />
              </View>
            </View>
          )}
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

        {!visualReady ? <ActivityIndicator color={tokens.accent} style={styles.loader} /> : null}
      </View>

      <View
        ref={captureRef}
        collapsable={false}
        pointerEvents="none"
        style={styles.offscreenCapture}>
        <ShowNightShareCard model={model} template={captureTemplate} onVisualReady={onVisualReady} />
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
    marginBottom: 16,
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
