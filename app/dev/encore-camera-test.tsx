import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EncoreCameraView,
  saveToPhotos,
  type EncoreCameraInfo,
  type EncoreCameraViewRef,
} from 'encore-camera';

export default function EncoreCameraTestScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<EncoreCameraViewRef>(null);
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [lastRecording, setLastRecording] = useState<{ uri: string; duration: number } | null>(
    null
  );
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [availableCameras, setAvailableCameras] = useState<EncoreCameraInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

  const handleSaveToPhotos = async () => {
    if (!lastRecording?.uri) return;

    setSaveStatus('saving');
    setErrorMessage(null);

    try {
      await saveToPhotos(lastRecording.uri);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Save to Photos failed');
    }
  };

  const handleToggleRecording = async () => {
    setErrorMessage(null);
    setSaveStatus('idle');

    if (isRecording) {
      try {
        const result = await cameraRef.current?.stopRecording();
        if (result) {
          setLastRecording(result);
        }
        setIsRecording(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Stop failed');
        setIsRecording(false);
      }
      return;
    }

    try {
      await cameraRef.current?.startRecording({ maxDuration: 120 });
      setIsRecording(true);
      setLastRecording(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Start failed');
      setIsRecording(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'EncoreCamera test', headerShown: true }} />
      <View style={styles.root}>
        <EncoreCameraView
          ref={cameraRef}
          style={styles.camera}
          active
          onCameraReady={(event) => {
            setStatus('ready');
            setErrorMessage(null);
            setAvailableCameras(event.nativeEvent.availableCameras);
            setSelectedCameraId(event.nativeEvent.selectedCameraId);
          }}
          onAvailableCamerasChanged={(event) => {
            setAvailableCameras(event.nativeEvent.availableCameras);
            setSelectedCameraId(event.nativeEvent.selectedCameraId);
          }}
          onCameraError={(event) => {
            setStatus('error');
            setErrorMessage(event.nativeEvent.message);
          }}
          onRecordingStarted={() => {
            setIsRecording(true);
          }}
          onRecordingFinished={(event) => {
            setLastRecording(event.nativeEvent);
            setIsRecording(false);
          }}
          onRecordingError={(event) => {
            setErrorMessage(event.nativeEvent.message);
            setIsRecording(false);
          }}
        />

        <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.label}>Camera status</Text>
          <Text style={styles.value}>{status}</Text>

          <Text style={styles.label}>Cameras</Text>
          {availableCameras.map((camera) => (
            <Pressable
              key={camera.id}
              onPress={() => {
                void cameraRef.current?.selectCamera(camera.id).catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : 'Camera switch failed');
                });
              }}
              style={[
                styles.cameraOption,
                selectedCameraId === camera.id && styles.cameraOptionSelected,
              ]}>
              <Text style={styles.value}>
                {camera.displayName} · {camera.suggestedZoomLabel} · {camera.position}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.label}>Recording</Text>
          <Text style={styles.value}>{isRecording ? 'recording' : 'idle'}</Text>

          <Pressable onPress={() => void handleToggleRecording()} style={styles.button}>
            <Text style={styles.buttonText}>{isRecording ? 'Stop recording' : 'Start recording'}</Text>
          </Pressable>

          {lastRecording ? (
            <>
              <Text style={styles.label}>Last file</Text>
              <Text style={styles.value}>{lastRecording.uri}</Text>
              <Text style={styles.label}>Duration (s)</Text>
              <Text style={styles.value}>{lastRecording.duration.toFixed(2)}</Text>

              <Pressable
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                onPress={() => void handleSaveToPhotos()}
                style={[styles.button, styles.saveButton]}>
                <Text style={styles.buttonText}>
                  {saveStatus === 'saving'
                    ? 'Saving…'
                    : saveStatus === 'saved'
                      ? 'Saved to Photos'
                      : 'Save to Photos'}
                </Text>
              </Pressable>
            </>
          ) : null}

          {errorMessage ? (
            <>
              <Text style={styles.label}>Error</Text>
              <Text style={[styles.value, styles.error]}>{errorMessage}</Text>
            </>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cameraOption: {
    borderColor: '#333',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cameraOptionSelected: {
    borderColor: '#1677ff',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#ff4d4f',
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  camera: {
    flex: 1,
  },
  error: {
    color: '#ffb4b4',
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  panel: {
    backgroundColor: '#111',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  root: {
    backgroundColor: '#000',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#1677ff',
  },
  value: {
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: 13,
  },
});
