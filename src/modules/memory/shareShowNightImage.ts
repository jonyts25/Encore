import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';

import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './showNightShareCardLogic';

export function showNightShareCacheUri(showId: string): string | null {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}encore-noche-${showId}.jpg`;
}

/** Remove cached share image when opening the screen (not when closing the share sheet). */
export async function deleteShowNightShareCache(showId: string): Promise<void> {
  const uri = showNightShareCacheUri(showId);
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

async function captureShowNightCardToCache(
  viewRef: RefObject<View | null>,
  showId: string
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('Share card is not ready');
  }

  const tmpUri = await captureRef(viewRef, {
    format: 'jpg',
    quality: 0.9,
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    result: 'tmpfile',
  });

  const dest = showNightShareCacheUri(showId);
  if (!dest) {
    throw new Error('Cache directory unavailable');
  }

  await FileSystem.copyAsync({ from: tmpUri, to: dest });

  if (__DEV__) {
    const info = await FileSystem.getInfoAsync(dest);
    const sizeKb =
      info.exists && 'size' in info && typeof info.size === 'number'
        ? Math.round(info.size / 1024)
        : null;
    console.log('[ShowNightShare] capture', {
      showId,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      uri: dest,
      sizeKb,
    });
  }

  return dest;
}

export async function captureAndShareShowNightCard(
  viewRef: RefObject<View | null>,
  showId: string
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Sharing is not available on web');
  }

  const uri = await captureShowNightCardToCache(viewRef, showId);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
  });
}

export async function captureShowNightCardForSave(
  viewRef: RefObject<View | null>,
  showId: string
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Saving is not available on web');
  }
  return captureShowNightCardToCache(viewRef, showId);
}
