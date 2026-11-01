import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareCardModel,
} from '../../showNightShareCardLogic';
import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';
import { ShowNightShareRatingStars } from './ShowNightShareRatingStars';
import { ShowNightShareWatermark } from './ShowNightShareWatermark';
import { useShareCardBackgroundReady } from './useShareCardBackgroundReady';

type Props = {
  model: ShowNightShareCardModel;
  onVisualReady?: () => void;
};

export function ShowNightSharePosterTemplate({ model, onVisualReady }: Props) {
  const { t } = useTranslation();
  const { onBackgroundLoad, onFallbackLoad } = useShareCardBackgroundReady(model, onVisualReady);

  const backgroundSource = model.backgroundUri
    ? { uri: model.backgroundUri }
    : model.fallbackArtistImageUrl
      ? { uri: model.fallbackArtistImageUrl }
      : null;

  const showLiveCount = model.liveSongCount != null;

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
        <View style={[StyleSheet.absoluteFill, styles.fallbackFill]} onLayout={onBackgroundLoad} />
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.55)', 'rgba(183,148,246,0.6)']}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.dateTop}>{model.posterDateLabel}</Text>

        <View style={styles.hero}>
          {showLiveCount ? (
            <>
              <Text style={styles.heroNumber}>{model.liveSongCount}</Text>
              <Text style={styles.heroLabel}>{t('showNightShare.poster.liveLabel')}</Text>
            </>
          ) : model.rating != null ? (
            <>
              <ShowNightShareRatingStars rating={model.rating} size={72} />
              <Text style={styles.heroLabel}>{t('showNightShare.poster.ratingLabel')}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={2} style={styles.artist}>
            {model.artistName}
          </Text>
          <Text numberOfLines={2} style={styles.venueLine}>
            {model.venueCityLine}
          </Text>
        </View>
      </View>

      <ShowNightShareWatermark />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: SHARE_NIGHT.background,
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
    width: SHARE_CARD_WIDTH,
  },
  fallbackFill: {
    backgroundColor: SHARE_NIGHT.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 120,
    paddingHorizontal: 64,
    paddingTop: 120,
  },
  dateTop: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 56,
    letterSpacing: 2,
  },
  hero: {
    alignItems: 'center',
    gap: 16,
  },
  heroNumber: {
    color: SHARE_NIGHT.green,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 180,
    letterSpacing: -4,
    lineHeight: 180,
  },
  heroLabel: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 32,
    letterSpacing: 2,
    opacity: 0.92,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    gap: 12,
  },
  artist: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 72,
    lineHeight: 76,
    textAlign: 'center',
  },
  venueLine: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 34,
    opacity: 0.88,
    textAlign: 'center',
  },
});
