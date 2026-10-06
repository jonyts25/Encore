import { requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';

import type { EncoreCameraViewProps, EncoreCameraViewRef } from './EncoreCamera.types';

type NativeEncoreCameraViewProps = EncoreCameraViewProps & React.RefAttributes<EncoreCameraViewRef>;

const NativeEncoreCameraView =
  requireNativeViewManager<NativeEncoreCameraViewProps>('EncoreCamera');

export const EncoreCameraView = React.forwardRef<EncoreCameraViewRef, EncoreCameraViewProps>(
  function EncoreCameraView(props, ref) {
    return <NativeEncoreCameraView {...props} ref={ref} />;
  }
);
