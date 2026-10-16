import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

export type EncoreCameraMode = 'single' | 'multiCamPreview' | 'multiCamRecord';

export type EncoreMultiCamFormat = {
  width: number;
  height: number;
  fps: number;
};

export type EncoreMultiCamCombination = {
  label: string;
  back: EncoreMultiCamFormat;
  front: EncoreMultiCamFormat;
};

export type EncoreMultiCamSupport = {
  isMultiCamSupported: boolean;
  supportedCombinations: EncoreMultiCamCombination[];
  recommendedCombination?: {
    back: EncoreMultiCamFormat;
    front: EncoreMultiCamFormat;
  };
};

export type EncoreMultiCamPreviewResult = {
  mode: EncoreCameraMode;
  hardwareCost: number;
  systemPressureCost: number;
  backFormat: EncoreMultiCamFormat;
  frontFormat: EncoreMultiCamFormat;
};

export type EncoreMultiCamRecordingResult = {
  backVideoURL: string;
  frontVideoURL: string;
  duration: number;
  startTimestamp: string;
  metadata: Record<string, unknown>;
};

type EncoreCameraNativeModule = {
  getCameraMode: () => Promise<EncoreCameraMode>;
  setCameraMode: (mode: EncoreCameraMode) => Promise<{ mode: EncoreCameraMode }>;
  getMultiCamSupport: () => Promise<EncoreMultiCamSupport>;
  startMultiCamPreview: () => Promise<EncoreMultiCamPreviewResult>;
  stopMultiCamPreview: () => Promise<void>;
  startMultiCamRecording: () => Promise<{ started: boolean; startTimestamp?: string }>;
  stopMultiCamRecording: () => Promise<EncoreMultiCamRecordingResult>;
};

type NativeMultiCamPreviewProps = {
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

type NativeMultiCamPreviewComponent = React.ComponentType<NativeMultiCamPreviewProps>;

let nativeModule: EncoreCameraNativeModule | null = null;
let nativeMultiCamBackPreview: NativeMultiCamPreviewComponent | null = null;
let nativeMultiCamFrontPreview: NativeMultiCamPreviewComponent | null = null;

function ensureIOS() {
  if (Platform.OS !== 'ios') {
    throw new Error('MultiCam is only available on iOS');
  }
}

function getNativeModule(): EncoreCameraNativeModule {
  ensureIOS();
  if (!nativeModule) {
    nativeModule = requireNativeModule<EncoreCameraNativeModule>('EncoreCamera');
  }
  return nativeModule;
}

function getNativeMultiCamBackPreview(): NativeMultiCamPreviewComponent | null {
  if (Platform.OS !== 'ios') return null;
  if (!nativeMultiCamBackPreview) {
    nativeMultiCamBackPreview = requireNativeViewManager<NativeMultiCamPreviewProps>(
      'EncoreCamera',
      'EncoreMultiCamBackPreviewView'
    );
  }
  return nativeMultiCamBackPreview;
}

function getNativeMultiCamFrontPreview(): NativeMultiCamPreviewComponent | null {
  if (Platform.OS !== 'ios') return null;
  if (!nativeMultiCamFrontPreview) {
    nativeMultiCamFrontPreview = requireNativeViewManager<NativeMultiCamPreviewProps>(
      'EncoreCamera',
      'EncoreMultiCamFrontPreviewView'
    );
  }
  return nativeMultiCamFrontPreview;
}

export function EncoreMultiCamBackPreview(props: NativeMultiCamPreviewProps) {
  const NativeView = getNativeMultiCamBackPreview();
  if (!NativeView) return <View style={props.style} />;
  return <NativeView {...props} />;
}

export function EncoreMultiCamFrontPreview(props: NativeMultiCamPreviewProps) {
  const NativeView = getNativeMultiCamFrontPreview();
  if (!NativeView) return <View style={props.style} />;
  return <NativeView {...props} />;
}

export async function getCameraMode(): Promise<EncoreCameraMode> {
  return getNativeModule().getCameraMode();
}

export async function setCameraMode(mode: EncoreCameraMode) {
  return getNativeModule().setCameraMode(mode);
}

export async function getMultiCamSupport(): Promise<EncoreMultiCamSupport> {
  return getNativeModule().getMultiCamSupport();
}

export async function startMultiCamPreview(): Promise<EncoreMultiCamPreviewResult> {
  return getNativeModule().startMultiCamPreview();
}

export async function stopMultiCamPreview(): Promise<void> {
  return getNativeModule().stopMultiCamPreview();
}

export async function startMultiCamRecording() {
  return getNativeModule().startMultiCamRecording();
}

export async function stopMultiCamRecording(): Promise<EncoreMultiCamRecordingResult> {
  return getNativeModule().stopMultiCamRecording();
}
