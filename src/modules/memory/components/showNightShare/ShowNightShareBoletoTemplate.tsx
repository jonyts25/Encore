import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { useTranslation } from '@/core/i18n';

import {
  decorativeBarcodeBarWidths,
  type ShowNightShareCardModel,
} from '../../showNightShareCardLogic';
import { BOLETO_TICKET_FIXED_HEIGHT } from '../../showNightShareLayoutMetrics';
import type { ImageSource } from 'expo-image';

import type { ShowNightShareFrameTransform } from '../../showNightShareMediaPreference';
import { SHARE_STORY_SAFE_BOTTOM, SHARE_STORY_SAFE_TOP } from '../../showNightShareSafeZones';
import { SHARE_NIGHT, SHARE_NIGHT_FONTS } from '../../showNightShareTheme';
import { ShowNightShareCanvas } from './ShowNightShareCanvas';
import { ShowNightShareMediaLayer } from './ShowNightShareMediaLayer';
import { ShowNightShareRatingStars } from './ShowNightShareRatingStars';

type Props = {
  model: ShowNightShareCardModel;
  mediaSource: ImageSource | null;
  frame: ShowNightShareFrameTransform;
  interactive?: boolean;
  onFrameChange?: (frame: ShowNightShareFrameTransform) => void;
  onMediaLoad?: () => void;
};

export function ShowNightShareBoletoTemplate({
  model,
  mediaSource,
  frame,
  interactive,
  onFrameChange,
  onMediaLoad,
}: Props) {
  const { t } = useTranslation();
  const bars = decorativeBarcodeBarWidths(model.showId);
  const [photoSize, setPhotoSize] = useState({ width: SHARE_CARD_INNER_WIDTH, height: 360 });

  const onPhotoLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setPhotoSize({ width, height });
    }
  };

  return (
    <ShowNightShareCanvas>
      <View style={styles.body}>
        <View style={styles.photoSlot} onLayout={onPhotoLayout}>
          <ShowNightShareMediaLayer
            borderRadius={36}
            fallbackSource={model.fallbackArtistImageUrl ? { uri: model.fallbackArtistImageUrl } : null}
            frame={frame}
            height={photoSize.height}
            interactive={interactive}
            source={mediaSource}
            width={photoSize.width}
            onFallbackLoad={onMediaLoad}
            onFrameChange={onFrameChange}
            onLoad={onMediaLoad}
          />
        </View>

        <View style={styles.ticket}>
          <Text style={styles.admit}>{t('showNightShare.ticket.admitOne')}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={2} style={styles.artist}>
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
              {model.rating != null ? <ShowNightShareRatingStars rating={model.rating} size={32} /> : null}
            </View>
            <View style={styles.barcode}>
              {bars.map((width, index) => (
                <View key={index} style={[styles.bar, { width }]} />
              ))}
            </View>
          </View>

          {model.liveSongCount != null ? (
            <Text numberOfLines={1} style={styles.liveCount}>
              {t('showNightShare.ticket.liveCount', { count: model.liveSongCount })}
            </Text>
          ) : null}
        </View>
      </View>
    </ShowNightShareCanvas>
  );
}

const SHARE_CARD_INNER_WIDTH = 1080 - 96;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingBottom: SHARE_STORY_SAFE_BOTTOM + 56,
    paddingHorizontal: 48,
    paddingTop: SHARE_STORY_SAFE_TOP,
  },
  photoSlot: {
    flex: 1,
    marginBottom: 20,
    minHeight: 120,
  },
  ticket: {
    backgroundColor: SHARE_NIGHT.ticketPaper,
    borderRadius: 28,
    height: BOLETO_TICKET_FIXED_HEIGHT,
    paddingBottom: 24,
    paddingHorizontal: 36,
    paddingTop: 28,
  },
  admit: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 20,
    letterSpacing: 2,
    opacity: 0.65,
    textTransform: 'uppercase',
  },
  artist: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 52,
    lineHeight: 56,
    marginTop: 6,
  },
  tour: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 24,
    marginTop: 2,
    opacity: 0.85,
  },
  perforationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: -36,
    marginVertical: 18,
  },
  notchLeft: {
    backgroundColor: SHARE_NIGHT.background,
    borderRadius: 999,
    height: 32,
    marginLeft: -16,
    width: 32,
  },
  notchRight: {
    backgroundColor: SHARE_NIGHT.background,
    borderRadius: 999,
    height: 32,
    marginRight: -16,
    width: 32,
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
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 4,
  },
  colLabel: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 16,
    letterSpacing: 1.2,
    opacity: 0.55,
    textTransform: 'uppercase',
  },
  colValue: {
    color: SHARE_NIGHT.ticketInk,
    fontFamily: SHARE_NIGHT_FONTS.title,
    fontSize: 22,
    lineHeight: 26,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  starsWrap: {
    flex: 1,
  },
  barcode: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 56,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: SHARE_NIGHT.ticketInk,
    height: '100%',
  },
  liveCount: {
    color: SHARE_NIGHT.green,
    fontFamily: SHARE_NIGHT_FONTS.body,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 12,
    textTransform: 'uppercase',
  },
});
