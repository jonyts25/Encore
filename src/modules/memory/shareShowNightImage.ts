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

const sessionCaptureUri = new Map<string, string>();

function cacheKey(showId: string, template: ShowNightShareTemplateId): string {
  return `${showId}:${template}`;
}

export function showNightShareCacheUri(
  showId: string,
  template: ShowNightShareTemplateId
): string | null {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}encore-noche-${showId}-${template}.jpg`;
}

export async function deleteShowNightShareCache(
  showId: string,
  template?: ShowNightShareTemplateId
): Promise<void> {
  if (template) {
    const uri = showNightShareCacheUri(showId, template);
    sessionCaptureUri.delete(cacheKey(showId, template));
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
    return;
  }
  for (const id of ['boleto', 'setlist', 'poster'] as ShowNightShareTemplateId[]) {
    await deleteShowNightShareCache(showId, id);
  }
}

async function captureShowNightCardToCache(
  viewRef: RefObject<View | null>,
  showId: string,
  template: ShowNightShareTemplateId
): Promise<string> {
  if (!viewRef.current) {
    throw new Error('Share card is not ready');
  }

  const key = cacheKey(showId, template);
  const existingSession = sessionCaptureUri.get(key);
  if (existingSession) {
    const info = await FileSystem.getInfoAsync(existingSession);
    if (info.exists) {
      return existingSession;
    }
    sessionCaptureUri.delete(key);
  }

  const dest = showNightShareCacheUri(showId, template);
  if (!dest) {
    throw new Error('Cache directory unavailable');
  }

  await FileSystem.deleteAsync(dest, { idempotent: true });

  const tmpUri = await captureRef(viewRef, {
    format: 'jpg',
    quality: 0.9,
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    result: 'tmpfile',
  });

  try {
    await FileSystem.copyAsync({ from: tmpUri, to: dest });
  } catch (error) {
    if (__DEV__) {
      console.error('[ShowNightShare] copyAsync failed', { showId, template, tmpUri, dest, error });
    }
    throw error;
  }

  sessionCaptureUri.set(key, dest);

  if (__DEV__) {
    const info = await FileSystem.getInfoAsync(dest);
    const sizeKb =
      info.exists && 'size' in info && typeof info.size === 'number'
        ? Math.round(info.size / 1024)
        : null;
    console.log('[ShowNightShare] capture', {
      showId,
      template,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      uri: dest,
      sizeKb,
    });
  }

  return dest;
}

export async function ensureShowNightShareCapture(
  viewRef: RefObject<View | null>,
  showId: string,
  template: ShowNightShareTemplateId
): Promise<string> {
  return captureShowNightCardToCache(viewRef, showId, template);
}

export async function captureAndShareShowNightCard(
  viewRef: RefObject<View | null>,
  showId: string,
  template: ShowNightShareTemplateId
): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Sharing is not available on web');
  }

  const uri = await ensureShowNightShareCapture(viewRef, showId, template);

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
  return ensureShowNightShareCapture(viewRef, showId, template);
}

/** Call when the visible template changes so the next share/save re-captures. */
export function invalidateShowNightShareSessionCapture(
  showId: string,
  template: ShowNightShareTemplateId
): void {
  sessionCaptureUri.delete(cacheKey(showId, template));
}
