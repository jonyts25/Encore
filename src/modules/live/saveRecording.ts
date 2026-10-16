import { saveToPhotos } from 'encore-camera';
import { Asset } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library';

export type SaveRecordingTarget = 'native' | 'expo';

export async function saveRecordingToCameraRoll(
  uri: string,
  target: SaveRecordingTarget
): Promise<void> {
  if (!uri.trim()) {
    throw new Error('EMPTY_RECORDING_FILE');
  }

  if (target === 'native') {
    await saveToPhotos(uri);
    return;
  }

  const mediaPermission = await MediaLibrary.requestPermissionsAsync();
  if (!mediaPermission.granted) {
    throw new Error('PHOTOS_PERMISSION_DENIED');
  }

  await Asset.create(uri);
}

export async function saveMultiCamRecordings(backUri: string, frontUri: string): Promise<void> {
  await saveRecordingToCameraRoll(backUri, 'native');
  await saveRecordingToCameraRoll(frontUri, 'native');
}
