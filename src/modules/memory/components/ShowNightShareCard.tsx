import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { typography } from '@/core/ui/theme/typography';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareCardModel,
} from '../showNightShareCardLogic';

type ShowNightShareCardProps = {
  model: ShowNightShareCardModel;
  onVisualReady?: () => void;
};

export function ShowNightShareCard({ model, onVisualReady }: ShowNightShareCardProps) {
  const { t } = useTranslation();
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  const visualReady = model.backgroundUri
    ? backgroundLoaded
    : model.fallbackArtistImageUrl
      ? fallbackLoaded
      : true;

  useEffect(() => {
    if (visualReady) {
      onVisualReady?.();
    }
  }, [onVisualReady, visualReady]);

  const onBackgroundLoad = useCallback(() => setBackgroundLoaded(true), []);
  const onFallbackLoad = useCallback(() => setFallbackLoaded(true), []);

  const backgroundSource = model.backgroundUri
    ? { uri: model.backgroundUri }
    : model.fallbackArtistImageUrl
      ? { uri: model.fallbackArtistImageUrl }
      : null;

  return (
    <View style={styles.root}>
      {backgroundSource ? (
        <Image
          contentFit="cover"
          source={backgroundSource}
          style={StyleSheet.absoluteFill}
          onLoad={model.backgroundUri ? onBackgroundLoad : onFallbackLoad}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallbackFill]} onLayout={() => setBackgroundLoaded(true)} />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.topBlock}>
          <Text style={styles.eyebrow}>{t('showNightShare.eyebrow')}</Text>
          <Text numberOfLines={3} style={styles.artistName}>
            {model.artistName}
          </Text>
          <Text numberOfLines={2} style={styles.venueLine}>
            {model.venueLine}
          </Text>

          {model.rating != null ? (
            <View accessibilityLabel={t('showNightShare.ratingA11y', { rating: model.rating })} style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Ionicons
                  key={value}
                  color={value <= model.rating! ? '#FFD60A' : 'rgba(255,255,255,0.35)'}
                  name={value <= model.rating! ? 'star' : 'star-outline'}
                  size={44}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.midBlock}>
          {model.highlightTitles.length > 0 ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoTitle}>{t('showNightShare.highlightsTitle')}</Text>
              {model.highlightTitles.map((title) => (
                <Text key={title} numberOfLines={1} style={styles.infoLine}>
                  {title}
                </Text>
              ))}
            </View>
          ) : null}

          {model.prediction ? (
            <Text style={styles.statLine}>
              {t('memory.setlist.predictionScore', {
                hits: model.prediction.hits,
                total: model.prediction.total,
              })}
            </Text>
          ) : null}

          {model.liveSongCount != null ? (
            <Text style={styles.statLine}>
              {t('showNightShare.liveSongCount', { count: model.liveSongCount })}
            </Text>
          ) : null}
        </View>

        <View style={styles.watermarkWrap}>
          <View style={styles.watermarkPill}>
            <Text style={styles.watermarkText}>{t('common.appName')}</Text>
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  fallbackFill: {
    backgroundColor: '#1c1c1e',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 72,
    paddingTop: 120,
    paddingBottom: 96,
  },
  topBlock: {
    gap: 20,
  },
  eyebrow: {
    ...typography.footnoteSemibold,
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  artistName: {
    ...typography.largeTitle,
    color: '#FFFFFF',
    fontSize: 72,
    lineHeight: 78,
    fontWeight: '700',
  },
  venueLine: {
    ...typography.title,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 34,
    lineHeight: 40,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  midBlock: {
    gap: 28,
  },
  infoBlock: {
    gap: 12,
  },
  infoTitle: {
    ...typography.title,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '600',
  },
  infoLine: {
    ...typography.body,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 32,
    lineHeight: 38,
  },
  statLine: {
    ...typography.bodySemibold,
    color: 'rgba(255,255,255,0.94)',
    fontSize: 34,
    lineHeight: 42,
  },
  watermarkWrap: {
    alignItems: 'center',
  },
  watermarkPill: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  watermarkText: {
    ...typography.bodySemibold,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 28,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
});
