import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, View } from 'react-native';

import type { EncoreCameraViewProps, EncoreCameraViewRef } from './EncoreCamera.types';

type NativeEncoreCameraViewProps = EncoreCameraViewProps & React.RefAttributes<EncoreCameraViewRef>;

type NativeEncoreCameraViewComponent = React.ComponentType<NativeEncoreCameraViewProps>;

let nativeEncoreCameraView: NativeEncoreCameraViewComponent | null = null;

function getNativeEncoreCameraView(): NativeEncoreCameraViewComponent | null {
  if (Platform.OS !== 'ios') return null;
  if (!nativeEncoreCameraView) {
    nativeEncoreCameraView =
      requireNativeViewManager<NativeEncoreCameraViewProps>('EncoreCamera');
  }
  return nativeEncoreCameraView;
}

export const EncoreCameraView = React.forwardRef<EncoreCameraViewRef, EncoreCameraViewProps>(
  function EncoreCameraView(props, ref) {
    const NativeView = getNativeEncoreCameraView();
    if (!NativeView) {
      return <View style={props.style} />;
    }
    return <NativeView {...props} ref={ref} />;
  }
);
