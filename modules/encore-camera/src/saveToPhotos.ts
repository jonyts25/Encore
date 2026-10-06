import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type SaveToPhotosResult = {
  success: true;
};

type EncoreCameraNativeModule = {
  saveToPhotos: (fileURL: string) => Promise<SaveToPhotosResult>;
};

const NativeEncoreCameraModule =
  requireNativeModule<EncoreCameraNativeModule>('EncoreCamera');

export async function saveToPhotos(fileURL: string): Promise<SaveToPhotosResult> {
  if (Platform.OS !== 'ios') {
    throw new Error('saveToPhotos is only available on iOS');
  }

  if (!fileURL.trim()) {
    throw new Error('A recording file URL is required');
  }

  return NativeEncoreCameraModule.saveToPhotos(fileURL);
}
