import { saveToPhotos } from 'encore-camera';
import { Asset } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';

export type SaveRecordingTarget = 'native' | 'expo';

export async function saveRecordingToCameraRoll(
  uri: string,
  target: SaveRecordingTarget
): Promise<void> {
  if (!uri.trim()) {
    throw new Error('EMPTY_RECORDING_FILE');
  }

  if (target === 'native') {
    if (Platform.OS !== 'ios') {
      throw new Error('Native photo library save is only available on iOS');
    }
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
  if (Platform.OS !== 'ios') {
    throw new Error('MultiCam save is only available on iOS');
  }
  await saveRecordingToCameraRoll(backUri, 'native');
  await saveRecordingToCameraRoll(frontUri, 'native');
}
