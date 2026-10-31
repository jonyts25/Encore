import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './showNightShareCardLogic';

export async function captureAndShareShowNightCard(viewRef: RefObject<View | null>): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Sharing is not available on web');
  }
  if (!viewRef.current) {
    throw new Error('Share card is not ready');
  }

  const uri = await captureRef(viewRef, {
    format: 'png',
    quality: 1,
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    result: 'tmpfile',
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
  });
}
