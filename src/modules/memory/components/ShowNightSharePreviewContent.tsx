import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
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
import { buildShowNightShareCardModel, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from '../showNightShareCardLogic';
import { captureAndShareShowNightCard } from '../shareShowNightImage';
import { ShowNightShareCard } from './ShowNightShareCard';

export function ShowNightSharePreviewContent() {
  const { id: showId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { tokens } = useEncoreTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const cardRef = useRef<View>(null);

  const [visualReady, setVisualReady] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  const previewScale = (windowWidth - 32) / SHARE_CARD_WIDTH;

  const onShare = useCallback(async () => {
    if (!visualReady || sharing) return;
    setSharing(true);
    try {
      await captureAndShareShowNightCard(cardRef);
    } catch {
      Alert.alert(t('showNightShare.shareError'));
    } finally {
      setSharing(false);
    }
  }, [sharing, t, visualReady]);

  if (!showId) {
    return null;
  }

  if (loading && !show) {
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[typography.body, styles.hint, { color: tokens.textSecondary }]}>
          {t('showNightShare.previewHint')}
        </Text>
        <View
          style={{
            width: windowWidth - 32,
            height: SHARE_CARD_HEIGHT * previewScale,
            alignItems: 'center',
          }}>
          <View
            ref={cardRef}
            collapsable={false}
            style={{ transform: [{ scale: previewScale }] }}>
            <ShowNightShareCard model={model} onVisualReady={() => setVisualReady(true)} />
          </View>
        </View>
        {!visualReady ? (
          <ActivityIndicator color={tokens.accent} style={styles.loader} />
        ) : null}
      </ScrollView>

      <View style={[styles.actions, { paddingHorizontal: 16 }]}>
        <PillButton title={t('common.back')} variant="secondary" onPress={() => router.back()} />
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
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  hint: {
    marginBottom: 16,
    textAlign: 'center',
  },
  loader: {
    marginTop: 12,
  },
  actions: {
    flexDirection: 'row',
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
