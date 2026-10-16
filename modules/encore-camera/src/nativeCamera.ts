import { requireNativeViewManager } from 'expo-modules-core';
import { Platform } from 'react-native';

import { isNativeCameraOptedOut } from './nativeCameraFlag';

export { isNativeCameraOptedOut } from './nativeCameraFlag';

export function isEncoreNativeCameraAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    requireNativeViewManager('EncoreCamera');
    return true;
  } catch {
    return false;
  }
}

export function shouldUseEncoreNativeCamera(): boolean {
  if (!isEncoreNativeCameraAvailable()) return false;
  return !isNativeCameraOptedOut();
}
