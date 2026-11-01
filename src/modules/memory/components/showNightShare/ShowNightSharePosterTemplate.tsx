import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import type { ShowNightShareCardModel } from '../../showNightShareCardLogic';
import type { ImageSource } from 'expo-image';

import type { ImageContentPosition } from 'expo-image';
import { SHARE_STORY_SAFE_BOTTOM, SHARE_STORY_SAFE_TOP } from '../../showNightShareSafeZones';
import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';
import { ShowNightShareCanvas } from './ShowNightShareCanvas';
import { ShowNightShareMediaLayer } from './ShowNightShareMediaLayer';
import { ShowNightShareRatingStars } from './ShowNightShareRatingStars';

type Props = {
  model: ShowNightShareCardModel;
  mediaSource: ImageSource | null;
  contentPosition: ImageContentPosition;
  onMediaLoad?: () => void;
};

export function ShowNightSharePosterTemplate({
  model,
  mediaSource,
  contentPosition,
  onMediaLoad,
}: Props) {
  const { t } = useTranslation();
  const showLiveCount = model.liveSongCount != null;

  return (
    <ShowNightShareCanvas>
      <View style={StyleSheet.absoluteFill}>
        <ShowNightShareMediaLayer
          contentPosition={contentPosition}
          fallbackSource={model.fallbackArtistImageUrl ? { uri: model.fallbackArtistImageUrl } : null}
          height={1920}
          source={mediaSource}
          width={1080}
          onFallbackLoad={onMediaLoad}
          onLoad={onMediaLoad}
        />
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.55)', 'rgba(183,148,246,0.6)']}
        locations={[0, 0.35, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.content}>
        <Text style={styles.dateTop}>{model.posterDateLabel}</Text>

        <View style={styles.hero}>
          {showLiveCount ? (
            <>
              <Text style={styles.heroNumber}>{model.liveSongCount}</Text>
              <Text style={styles.heroLabel}>{t('showNightShare.poster.liveLabel')}</Text>
            </>
          ) : model.rating != null ? (
            <>
              <ShowNightShareRatingStars rating={model.rating} size={64} />
              <Text style={styles.heroLabel}>{t('showNightShare.poster.ratingLabel')}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text adjustsFontSizeToFit minimumFontScale={0.45} numberOfLines={2} style={styles.artist}>
            {model.artistName}
          </Text>
          <Text numberOfLines={2} style={styles.venueLine}>
            {model.venueCityLine}
          </Text>
        </View>
      </View>
    </ShowNightShareCanvas>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: SHARE_STORY_SAFE_BOTTOM + 72,
    paddingHorizontal: 64,
    paddingTop: SHARE_STORY_SAFE_TOP,
  },
  dateTop: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 52,
    letterSpacing: 2,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    marginTop: -24,
  },
  heroNumber: {
    color: SHARE_NIGHT.green,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 168,
    letterSpacing: -4,
    lineHeight: 168,
  },
  heroLabel: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 28,
    letterSpacing: 2,
    opacity: 0.92,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  footer: {
    gap: 10,
    minHeight: 120,
  },
  artist: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 64,
    lineHeight: 68,
    textAlign: 'center',
  },
  venueLine: {
    color: SHARE_NIGHT.text,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 30,
    opacity: 0.88,
    textAlign: 'center',
  },
});
