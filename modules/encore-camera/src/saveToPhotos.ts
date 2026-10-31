import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type SaveToPhotosResult = {
  saved: boolean;
  assetId: string | null;
};

type EncoreCameraNativeModule = {
  saveToPhotos: (fileURL: string) => Promise<SaveToPhotosResult>;
};

let nativeModule: EncoreCameraNativeModule | null = null;

function getNativeModule(): EncoreCameraNativeModule {
  if (Platform.OS !== 'ios') {
    throw new Error('saveToPhotos is only available on iOS');
  }
  if (!nativeModule) {
    nativeModule = requireNativeModule<EncoreCameraNativeModule>('EncoreCamera');
  }
  return nativeModule;
}

export async function saveToPhotos(fileURL: string): Promise<SaveToPhotosResult> {
  if (!fileURL.trim()) {
    throw new Error('A recording file URL is required');
  }

  return getNativeModule().saveToPhotos(fileURL);
}
