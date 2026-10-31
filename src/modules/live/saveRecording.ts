import { saveToPhotos, type SaveToPhotosResult } from 'encore-camera';
import { Asset } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

import { persistShowMedia } from '@/modules/events/showMediaApi';
import type { ShowMediaInsertPayload } from '@/modules/events/showMediaTypes';
import { mapMediaLibraryType } from '@/modules/events/showNightLogic';

export type SaveRecordingTarget = 'native' | 'expo';

export type SaveRecordingContext = {
  userId?: string | null;
  showId?: string | null;
  songId?: string | null;
  takenAt?: string;
};

export type SaveRecordingResult = {
  saved: boolean;
  assetId: string | null;
};

async function registerShowMediaFromSave(
  context: SaveRecordingContext | undefined,
  assetId: string | null,
  mediaType: 'photo' | 'video'
): Promise<void> {
  if (!context?.showId || !assetId) return;

  const payload: ShowMediaInsertPayload = {
    show_id: context.showId,
    asset_id: assetId,
    media_type: mediaType,
    taken_at: context.takenAt ?? new Date().toISOString(),
    song_id: context.songId ?? null,
    source: 'live',
  };

  await persistShowMedia(context.userId, payload);
}

export async function saveRecordingToCameraRoll(
  uri: string,
  target: SaveRecordingTarget,
  context?: SaveRecordingContext
): Promise<SaveRecordingResult> {
  if (!uri.trim()) {
    throw new Error('EMPTY_RECORDING_FILE');
  }

  if (target === 'native') {
    if (Platform.OS !== 'ios') {
      throw new Error('Native photo library save is only available on iOS');
    }
    const result: SaveToPhotosResult = await saveToPhotos(uri);
    if (result.saved && result.assetId) {
      await registerShowMediaFromSave(context, result.assetId, 'video');
    }
    return { saved: result.saved, assetId: result.assetId };
  }

  const mediaPermission = await MediaLibrary.requestPermissionsAsync();
  if (!mediaPermission.granted) {
    throw new Error('PHOTOS_PERMISSION_DENIED');
  }

  const asset = await Asset.create(uri);
  const libraryType = await asset.getMediaType();
  const mediaType = mapMediaLibraryType(libraryType) ?? 'video';
  if (asset.id) {
    await registerShowMediaFromSave(context, asset.id, mediaType);
  }
  return { saved: true, assetId: asset.id ?? null };
}

export async function saveMultiCamRecordings(
  backUri: string,
  frontUri: string,
  context?: SaveRecordingContext
): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('MultiCam save is only available on iOS');
  }
  await saveRecordingToCameraRoll(backUri, 'native', context);
  await saveRecordingToCameraRoll(frontUri, 'native', context);
}
