import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import type { CameraButtonEventPayload, VolumeButtonEventPayload } from 'expo-hardware-buttons';

type HardwareButtonsNative = {
  attachCameraButton(): void;
  detachCameraButton(): void;
  addListener(
    eventName: 'onVolumeButton' | 'onCameraButton',
    listener: (payload: VolumeButtonEventPayload | CameraButtonEventPayload) => void
  ): { remove(): void };
};

const HardwareButtons = requireOptionalNativeModule<HardwareButtonsNative>('HardwareButtons');

/**
 * iOS only. Volume buttons + Camera Control (iPhone 16+/17+) as shutter.
 * Requires a dev build — not available in Expo Go.
 */
export function useLiveHardwareShutter(onShutter: () => void, enabled: boolean) {
  const onShutterRef = useRef(onShutter);
  onShutterRef.current = onShutter;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios' || !HardwareButtons) return;

    HardwareButtons.attachCameraButton();

    const volumeSub = HardwareButtons.addListener('onVolumeButton', () => {
      onShutterRef.current();
    });

    const cameraSub = HardwareButtons.addListener('onCameraButton', () => {
      onShutterRef.current();
    });

    return () => {
      volumeSub.remove();
      cameraSub.remove();
      HardwareButtons.detachCameraButton();
    };
  }, [enabled]);
}

export function isLiveHardwareShutterAvailable(): boolean {
  return Platform.OS === 'ios' && HardwareButtons != null;
}
