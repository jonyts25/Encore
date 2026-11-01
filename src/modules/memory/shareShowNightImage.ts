import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import type { RefObject } from 'react';
import type { View } from 'react-native';

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareTemplateId,
} from './showNightShareCardLogic';

const CAPTURE_VERSION_KEY = 'v3';

function cacheKey(showId: string, template: ShowNightShareTemplateId, versionToken: string): string {
  return `${showId}:${template}:${versionToken}`;
}

let captureVersionToken = CAPTURE_VERSION_KEY;

/** Bump when photo, template, framing, or highlights change so cached files are not reused incorrectly. */
export function bumpShowNightShareCaptureVersion(): void {
  captureVersionToken = `${CAPTURE_VERSION_KEY}-${Date.now()}`;
}

export function showNightShareCacheUri(
  showId: string,
  template: ShowNightShareTemplateId
): string | null {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}encore-noche-${showId}-${template}.jpg`;
}

export async function waitForShareCardBackgroundReady(
  waitFn: () => Promise<void>,
  timeoutMs = 3000
): Promise<void> {
  await Promise.race([
    waitFn(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}

async function captureShowNightCardToCache(
  viewRef: RefObject<View | null>,
  showId: string,
  template: ShowNightShareTemplateId
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('Share card view is not mounted');
  }

  const dest = showNightShareCacheUri(showId, template);
  if (!dest) {
    throw new Error('Cache directory unavailable');
  }

  await FileSystem.deleteAsync(dest, { idempotent: true });

  let tmpUri: string;
  try {
    tmpUri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.9,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      result: 'tmpfile',
    });
  } catch (error) {
    if (__DEV__) {
      console.error('[ShowNightShare] captureRef failed', { showId, template, error });
    }
    throw error;
  }

  try {
    await FileSystem.copyAsync({ from: tmpUri, to: dest });
  } catch (error) {
    if (__DEV__) {
      console.error('[ShowNightShare] copyAsync failed', { showId, template, tmpUri, dest, error });
    }
    throw error;
  }

  if (__DEV__) {
    const info = await FileSystem.getInfoAsync(dest);
    const sizeKb =
      info.exists && 'size' in info && typeof info.size === 'number'
        ? Math.round(info.size / 1024)
        : null;
    console.log('[ShowNightShare] capture', {
      showId,
      template,
      version: cacheKey(showId, template, captureVersionToken),
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
  showId: string,
  template: ShowNightShareTemplateId
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Sharing is not available on web');
  }

  const uri = await captureShowNightCardToCache(viewRef, showId, template);

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
  showId: string,
  template: ShowNightShareTemplateId
): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error('Saving is not available on web');
  }
  return captureShowNightCardToCache(viewRef, showId, template);
}
