import type { StyleProp, ViewStyle } from 'react-native';

export type EncoreCameraErrorEvent = {
  message: string;
};

export type EncoreCameraRecordingFinishedEvent = {
  uri: string;
  duration: number;
};

export type EncoreCameraRecordingOptions = {
  maxDuration?: number;
};

export type EncoreCameraZoomState = {
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
  technicalMinZoom: number;
  technicalMaxZoom: number;
};

export type EncoreCameraTorchState = {
  torchSupported: boolean;
  torchEnabled: boolean;
};

export type EncoreCameraPosition = 'back' | 'front' | 'unspecified';

export type EncoreCameraDeviceType =
  | 'ultraWide'
  | 'wide'
  | 'telephoto'
  | 'dual'
  | 'dualWide'
  | 'triple'
  | 'trueDepth'
  | 'lidarDepth'
  | string;

export type EncoreCameraInfo = {
  id: string;
  position: EncoreCameraPosition;
  deviceType: EncoreCameraDeviceType;
  displayName: string;
  suggestedZoomLabel: string;
};

export type EncoreCameraResolution = {
  width: number;
  height: number;
};

export type EncoreCameraSupportedFormat = EncoreCameraResolution & {
  fpsOptions: number[];
};

export type EncoreCameraCapabilities = {
  multiCamSupported: boolean;
  cameraControlSupported: boolean;
  hardwareCaptureEventsSupported: boolean;
  torchSupported: boolean;
  tapToFocusSupported: boolean;
  exposureSupported: boolean;
  availableCameras: EncoreCameraInfo[];
  minZoom: number;
  maxZoom: number;
  supports60fps: boolean;
  supportedResolutions: EncoreCameraResolution[];
  activeStabilizationMode?: string;
};

export type EncoreCameraFormatSelection = EncoreCameraResolution & {
  fps: number;
};

export type EncoreCameraSetFormatSuccess = EncoreCameraFormatSelection & {
  success: true;
  stabilizationMode: string;
};

export type EncoreCameraSetFormatFailure = {
  success: false;
  code: string;
  message: string;
  requested: EncoreCameraFormatSelection;
  availableFormats: EncoreCameraSupportedFormat[];
};

export type EncoreCameraSetFormatResult =
  | EncoreCameraSetFormatSuccess
  | EncoreCameraSetFormatFailure;

export type EncoreCameraStabilizationState = {
  activeMode: string;
  availableModes: string[];
};

export type EncoreCameraSwitchedEvent = {
  activeCameraPosition: EncoreCameraPosition;
  selectedCameraId: string | null;
};

export type EncoreCameraState = EncoreCameraZoomState &
  EncoreCameraTorchState & {
    availableCameras: EncoreCameraInfo[];
    selectedCameraId: string | null;
    activeCameraPosition: EncoreCameraPosition;
    capabilities: EncoreCameraCapabilities;
    activeFormat?: EncoreCameraFormatSelection;
    activeStabilizationMode: string;
    lensZoomFactors?: number[];
  };

export type EncoreCameraAvailableCamerasEvent = {
  availableCameras: EncoreCameraInfo[];
  selectedCameraId: string | null;
};

export type EncoreCameraViewRef = {
  startRecording: (options?: EncoreCameraRecordingOptions) => Promise<void>;
  stopRecording: () => Promise<EncoreCameraRecordingFinishedEvent>;
  isRecording: () => Promise<boolean>;
  setZoom: (factor: number) => Promise<EncoreCameraZoomState>;
  getZoomState: () => Promise<EncoreCameraZoomState>;
  getAvailableCameras: () => Promise<EncoreCameraInfo[]>;
  getCameraState: () => Promise<EncoreCameraState>;
  selectCamera: (id: string) => Promise<EncoreCameraState>;
  switchCamera: () => Promise<EncoreCameraState>;
  getTorchState: () => Promise<EncoreCameraTorchState>;
  setTorch: (enabled: boolean) => Promise<EncoreCameraTorchState>;
  getCapabilities: () => Promise<EncoreCameraCapabilities>;
  getSupportedFormats: () => Promise<EncoreCameraSupportedFormat[]>;
  setFormat: (options: EncoreCameraFormatSelection) => Promise<EncoreCameraSetFormatResult>;
  getStabilizationState: () => Promise<EncoreCameraStabilizationState>;
};

export type EncoreCameraViewProps = {
  /** When true, native starts the AVFoundation session; false stops it. */
  active?: boolean;
  onCameraReady?: (event: { nativeEvent: EncoreCameraState }) => void;
  onCameraError?: (event: { nativeEvent: EncoreCameraErrorEvent }) => void;
  onRecordingStarted?: (event: { nativeEvent: Record<string, never> }) => void;
  onRecordingFinished?: (event: { nativeEvent: EncoreCameraRecordingFinishedEvent }) => void;
  onRecordingError?: (event: { nativeEvent: EncoreCameraErrorEvent }) => void;
  onZoomChanged?: (event: { nativeEvent: EncoreCameraZoomState }) => void;
  onAvailableCamerasChanged?: (event: {
    nativeEvent: EncoreCameraAvailableCamerasEvent;
  }) => void;
  onTorchChanged?: (event: { nativeEvent: EncoreCameraTorchState }) => void;
  onCameraSwitched?: (event: { nativeEvent: EncoreCameraSwitchedEvent }) => void;
  style?: StyleProp<ViewStyle>;
};
