export { EncoreCameraView } from './EncoreCameraView';
export type {
  EncoreCameraAvailableCamerasEvent,
  EncoreCameraCapabilities,
  EncoreCameraDeviceType,
  EncoreCameraFormatSelection,
  EncoreCameraInfo,
  EncoreCameraPosition,
  EncoreCameraRecordingFinishedEvent,
  EncoreCameraRecordingOptions,
  EncoreCameraResolution,
  EncoreCameraSetFormatResult,
  EncoreCameraStabilizationState,
  EncoreCameraState,
  EncoreCameraSupportedFormat,
  EncoreCameraSwitchedEvent,
  EncoreCameraErrorEvent,
  EncoreCameraTorchState,
  EncoreCameraZoomState,
  EncoreCameraViewProps,
  EncoreCameraViewRef,
} from './EncoreCamera.types';
export {
  isEncoreNativeCameraAvailable,
  shouldUseEncoreNativeCamera,
} from './nativeCamera';
export { saveToPhotos } from './saveToPhotos';
export type { SaveToPhotosResult } from './saveToPhotos';
export {
  EncoreMultiCamBackPreview,
  EncoreMultiCamFrontPreview,
  getCameraMode,
  getMultiCamSupport,
  setCameraMode,
  startMultiCamPreview,
  startMultiCamRecording,
  stopMultiCamPreview,
  stopMultiCamRecording,
} from './multiCam';
export type {
  EncoreCameraMode,
  EncoreMultiCamCombination,
  EncoreMultiCamFormat,
  EncoreMultiCamPreviewResult,
  EncoreMultiCamRecordingResult,
  EncoreMultiCamSupport,
} from './multiCam';
