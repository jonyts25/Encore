import { CameraView } from 'expo-camera';
import {
  EncoreCameraView,
  type EncoreCameraState,
  type EncoreCameraViewRef,
  type EncoreCameraZoomState,
} from 'encore-camera';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export type LiveCameraPreviewRef = {
  stopRecording: () => void;
  recordAsync: (options?: { maxDuration?: number }) => Promise<{ uri: string } | undefined>;
  switchNativeCamera: () => Promise<void>;
  setNativeTorch: (enabled: boolean) => Promise<boolean>;
  selectNativeLens: (cameraId: string, zoomFactor: number) => Promise<void>;
  setNativeZoom: (factor: number) => Promise<void>;
};

type LiveCameraPreviewProps = {
  useNativePreview: boolean;
  active: boolean;
  facing: 'back' | 'front';
  torchOn: boolean;
  zoom: number;
  style?: StyleProp<ViewStyle>;
  onCameraReady?: () => void;
  onNativeCameraError?: (message: string) => void;
  onNativeCameraState?: (state: EncoreCameraState) => void;
  onNativeZoomChanged?: (zoom: EncoreCameraZoomState) => void;
  onNativeRecordingStarted?: () => void;
  onNativeRecordingFinished?: (uri: string) => void;
  onNativeRecordingError?: (message: string) => void;
};

type PendingRecording = {
  resolve: (value: { uri: string }) => void;
  reject: (reason?: unknown) => void;
};

export const LiveCameraPreview = forwardRef<LiveCameraPreviewRef, LiveCameraPreviewProps>(
  function LiveCameraPreview(
    {
      useNativePreview,
      active,
      facing,
      torchOn,
      zoom,
      style,
      onCameraReady,
      onNativeCameraError,
      onNativeCameraState,
      onNativeZoomChanged,
      onNativeRecordingStarted,
      onNativeRecordingFinished,
      onNativeRecordingError,
    },
    ref
  ) {
    const expoCameraRef = useRef<CameraView>(null);
    const nativeCameraRef = useRef<EncoreCameraViewRef>(null);
    const pendingRecordingRef = useRef<PendingRecording | null>(null);
    const onNativeCameraStateRef = useRef(onNativeCameraState);
    const onNativeZoomChangedRef = useRef(onNativeZoomChanged);
    const onNativeRecordingStartedRef = useRef(onNativeRecordingStarted);
    const onNativeRecordingFinishedRef = useRef(onNativeRecordingFinished);
    const onNativeRecordingErrorRef = useRef(onNativeRecordingError);

    onNativeCameraStateRef.current = onNativeCameraState;
    onNativeZoomChangedRef.current = onNativeZoomChanged;
    onNativeRecordingStartedRef.current = onNativeRecordingStarted;
    onNativeRecordingFinishedRef.current = onNativeRecordingFinished;
    onNativeRecordingErrorRef.current = onNativeRecordingError;

    const notifyNativeCameraState = (state: EncoreCameraState) => {
      onNativeCameraStateRef.current?.(state);
    };

    const notifyNativeZoomChanged = (zoomState: EncoreCameraZoomState) => {
      onNativeZoomChangedRef.current?.(zoomState);
    };

    useImperativeHandle(ref, () => ({
      stopRecording: () => {
        if (useNativePreview) {
          void nativeCameraRef.current?.stopRecording();
          return;
        }
        expoCameraRef.current?.stopRecording();
      },
      recordAsync: async (options) => {
        if (useNativePreview) {
          const nativeRef = nativeCameraRef.current;
          if (!nativeRef) return undefined;

          return new Promise<{ uri: string }>((resolve, reject) => {
            pendingRecordingRef.current = { resolve, reject };
            void nativeRef.startRecording({ maxDuration: options?.maxDuration }).catch((error) => {
              pendingRecordingRef.current = null;
              reject(error);
            });
          });
        }

        if (!expoCameraRef.current) return undefined;
        return expoCameraRef.current.recordAsync(options);
      },
      switchNativeCamera: async () => {
        const nativeRef = nativeCameraRef.current;
        if (!nativeRef) {
          throw new Error('Native camera is not ready');
        }
        const state = await nativeRef.switchCamera();
        notifyNativeCameraState(state);
      },
      setNativeTorch: async (enabled: boolean) => {
        const nativeRef = nativeCameraRef.current;
        if (!nativeRef) {
          throw new Error('Native camera is not ready');
        }
        const torchState = await nativeRef.setTorch(enabled);
        const state = await nativeRef.getCameraState();
        notifyNativeCameraState(state);
        return torchState.torchEnabled;
      },
      selectNativeLens: async (cameraId: string, zoomFactor: number) => {
        const nativeRef = nativeCameraRef.current;
        if (!nativeRef) {
          throw new Error('Native camera is not ready');
        }
        const state = await nativeRef.selectCamera(cameraId);
        const zoomState = await nativeRef.setZoom(zoomFactor);
        notifyNativeCameraState({ ...state, ...zoomState });
      },
      setNativeZoom: async (factor: number) => {
        const nativeRef = nativeCameraRef.current;
        if (!nativeRef) {
          throw new Error('Native camera is not ready');
        }
        const zoomState = await nativeRef.setZoom(factor);
        notifyNativeZoomChanged(zoomState);
      },
    }));

    if (useNativePreview) {
      return (
        <EncoreCameraView
          ref={nativeCameraRef}
          style={[StyleSheet.absoluteFill, style]}
          active={active}
          onCameraReady={(event) => {
            notifyNativeCameraState(event.nativeEvent);
            onCameraReady?.();
          }}
          onCameraError={(event) => {
            onNativeCameraError?.(event.nativeEvent.message);
          }}
          onZoomChanged={(event) => {
            notifyNativeZoomChanged(event.nativeEvent);
          }}
          onRecordingStarted={() => {
            if (pendingRecordingRef.current === null) {
              onNativeRecordingStartedRef.current?.();
            }
          }}
          onRecordingFinished={(event) => {
            const pending = pendingRecordingRef.current;
            if (pending) {
              pendingRecordingRef.current = null;
              pending.resolve({ uri: event.nativeEvent.uri });
              return;
            }
            onNativeRecordingFinishedRef.current?.(event.nativeEvent.uri);
          }}
          onRecordingError={(event) => {
            const pending = pendingRecordingRef.current;
            if (pending) {
              pendingRecordingRef.current = null;
              pending.reject(new Error(event.nativeEvent.message));
              return;
            }
            onNativeRecordingErrorRef.current?.(event.nativeEvent.message);
          }}
        />
      );
    }

    return (
      <CameraView
        ref={expoCameraRef}
        style={style ?? StyleSheet.absoluteFill}
        mode="video"
        facing={facing}
        enableTorch={facing === 'back' && torchOn}
        zoom={zoom}
      />
    );
  }
);
