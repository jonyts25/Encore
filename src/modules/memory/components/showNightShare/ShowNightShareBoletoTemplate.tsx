import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import {
  decorativeBarcodeBarWidths,
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

const PHOTO_HEIGHT = Math.round(SHARE_CARD_HEIGHT * 0.55);

export function ShowNightShareBoletoTemplate({ model, onVisualReady }: Props) {
  const { t } = useTranslation();
  const { onBackgroundLoad, onFallbackLoad } = useShareCardBackgroundReady(model, onVisualReady);
  const bars = decorativeBarcodeBarWidths(model.showId);

  const backgroundSource = model.backgroundUri
    ? { uri: model.backgroundUri }
    : model.fallbackArtistImageUrl
      ? { uri: model.fallbackArtistImageUrl }
      : null;

  return (
    <View style={styles.root}>
      <View style={styles.photoFrame}>
        {backgroundSource ? (
          <Image
            contentFit="cover"
            source={backgroundSource}
            style={styles.photo}
            onLoad={model.backgroundUri ? onBackgroundLoad : onFallbackLoad}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]} onLayout={onBackgroundLoad} />
        )}
      </View>

      <View style={styles.ticketOuter}>
        <View style={styles.ticket}>
          <Text style={styles.admit}>{t('showNightShare.ticket.admitOne')}</Text>
          <Text numberOfLines={2} style={styles.artist}>
            {model.artistName}
          </Text>
          {model.tourName ? (
            <Text numberOfLines={1} style={styles.tour}>
              {model.tourName}
            </Text>
          ) : null}

          <View style={styles.perforationRow}>
            <View style={styles.notchLeft} />
            <View style={styles.dashedLine} />
            <View style={styles.notchRight} />
          </View>

          <View style={styles.columns}>
            <View style={styles.column}>
              <Text style={styles.colLabel}>{t('showNightShare.ticket.dateLabel')}</Text>
              <Text numberOfLines={2} style={styles.colValue}>
                {model.ticketDateLabel}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.colLabel}>{t('showNightShare.ticket.venueLabel')}</Text>
              <Text numberOfLines={2} style={styles.colValue}>
                {model.venueName}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.colLabel}>{t('showNightShare.ticket.cityLabel')}</Text>
              <Text numberOfLines={2} style={styles.colValue}>
                {model.city}
              </Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.starsWrap}>
              {model.rating != null ? <ShowNightShareRatingStars rating={model.rating} size={36} /> : null}
            </View>
            <View style={styles.barcode}>
              {bars.map((width, index) => (
                <View key={index} style={[styles.bar, { width }]} />
              ))}
            </View>
          </View>

          {model.liveSongCount != null ? (
            <Text style={styles.liveCount}>
              {t('showNightShare.ticket.liveCount', { count: model.liveSongCount })}
            </Text>
          ) : null}
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
    width: SHARE_CARD_WIDTH,
  },
  photoFrame: {
    height: PHOTO_HEIGHT,
    paddingHorizontal: 48,
    paddingTop: 48,
  },
  photo: {
    borderRadius: 36,
    flex: 1,
    overflow: 'hidden',
  },
  photoFallback: {
    backgroundColor: SHARE_NIGHT.surface,
  },
  ticketOuter: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 28,
  },
  ticket: {
    backgroundColor: SHARE_NIGHT.ticketPaper,
    borderRadius: 28,
    flex: 1,
    paddingBottom: 32,
    paddingHorizontal: 40,
    paddingTop: 36,
  },
  admit: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 22,
    letterSpacing: 2,
    opacity: 0.65,
    textTransform: 'uppercase',
  },
  artist: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 64,
    letterSpacing: -1,
    lineHeight: 68,
    marginTop: 8,
  },
  tour: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 28,
    marginTop: 4,
    opacity: 0.85,
  },
  perforationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 28,
    marginHorizontal: -40,
  },
  notchLeft: {
    backgroundColor: SHARE_NIGHT.background,
    borderRadius: 999,
    height: 36,
    marginLeft: -18,
    width: 36,
  },
  notchRight: {
    backgroundColor: SHARE_NIGHT.background,
    borderRadius: 999,
    height: 36,
    marginRight: -18,
    width: 36,
  },
  dashedLine: {
    borderColor: 'rgba(23,11,51,0.35)',
    borderStyle: 'dashed',
    borderTopWidth: 2,
    flex: 1,
    height: 0,
  },
  columns: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 6,
  },
  colLabel: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 18,
    letterSpacing: 1.5,
    opacity: 0.55,
    textTransform: 'uppercase',
  },
  colValue: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 26,
    lineHeight: 30,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 24,
    marginTop: 28,
  },
  starsWrap: {
    flex: 1,
  },
  barcode: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 72,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: SHARE_NIGHT.ticketInk,
    height: '100%',
  },
  liveCount: {
    color: SHARE_NIGHT.green,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 20,
    textTransform: 'uppercase',
  },
});
