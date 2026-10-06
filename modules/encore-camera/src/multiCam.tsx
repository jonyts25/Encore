import { requireNativeModule, requireNativeViewManager } from 'expo-modules-core';
import * as React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

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

const NativeModule = requireNativeModule<EncoreCameraNativeModule>('EncoreCamera');

type NativeMultiCamPreviewProps = {
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

const NativeMultiCamBackPreview = requireNativeViewManager<NativeMultiCamPreviewProps>(
  'EncoreCamera',
  'EncoreMultiCamBackPreviewView'
);
const NativeMultiCamFrontPreview = requireNativeViewManager<NativeMultiCamPreviewProps>(
  'EncoreCamera',
  'EncoreMultiCamFrontPreviewView'
);

export function EncoreMultiCamBackPreview(props: NativeMultiCamPreviewProps) {
  return <NativeMultiCamBackPreview {...props} />;
}

export function EncoreMultiCamFrontPreview(props: NativeMultiCamPreviewProps) {
  return <NativeMultiCamFrontPreview {...props} />;
}

function ensureIOS() {
  if (Platform.OS !== 'ios') {
    throw new Error('MultiCam is only available on iOS');
  }
}

export async function getCameraMode(): Promise<EncoreCameraMode> {
  ensureIOS();
  return NativeModule.getCameraMode();
}

export async function setCameraMode(mode: EncoreCameraMode) {
  ensureIOS();
  return NativeModule.setCameraMode(mode);
}

export async function getMultiCamSupport(): Promise<EncoreMultiCamSupport> {
  ensureIOS();
  return NativeModule.getMultiCamSupport();
}

export async function startMultiCamPreview(): Promise<EncoreMultiCamPreviewResult> {
  ensureIOS();
  return NativeModule.startMultiCamPreview();
}

export async function stopMultiCamPreview(): Promise<void> {
  ensureIOS();
  return NativeModule.stopMultiCamPreview();
}

export async function startMultiCamRecording() {
  ensureIOS();
  return NativeModule.startMultiCamRecording();
}

export async function stopMultiCamRecording(): Promise<EncoreMultiCamRecordingResult> {
  ensureIOS();
  return NativeModule.stopMultiCamRecording();
}
