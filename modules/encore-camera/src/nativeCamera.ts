import { requireNativeViewManager } from 'expo-modules-core';
import { Platform } from 'react-native';

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
  const flag = process.env.EXPO_PUBLIC_USE_NATIVE_CAMERA?.trim().toLowerCase();
  return isEncoreNativeCameraAvailable() && (flag === 'true' || flag === '1');
}
