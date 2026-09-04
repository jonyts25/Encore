import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText } from '@/core/ui/Themed';
import { useLyrics } from '@/modules/lyrics';

import { usePinchZoom } from '../hooks/usePinchZoom';
import { LiveLyricsOverlay } from './LiveLyricsOverlay';

type LiveCameraContentProps = {
  artist: string;
  title: string;
};

const TOP_BAR_CONTENT_HEIGHT = 44;

export function LiveCameraContent({ artist, title }: LiveCameraContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torchOn, setTorchOn] = useState(false);
  const { zoom, pinchGesture } = usePinchZoom();

  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { lyrics, isLoading: lyricsLoading, error: lyricsError, notFound } = useLyrics(artist, title);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!cameraPermission?.granted) {
        await requestCameraPermission();
      }
      if (!micPermission?.granted) {
        await requestMicPermission();
      }
      if (mounted) {
        setPermissionsRequested(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    cameraPermission?.granted,
    micPermission?.granted,
    requestCameraPermission,
    requestMicPermission,
  ]);

  useEffect(() => {
    if (facing === 'front') {
      setTorchOn(false);
    }
  }, [facing]);

  const permissionsGranted = Boolean(cameraPermission?.granted && micPermission?.granted);
  const lyricsUnavailable = Boolean(lyricsError || notFound || !lyrics);
  const headerOffset = insets.top + TOP_BAR_CONTENT_HEIGHT;

  const handleToggleRecording = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!cameraRef.current) return;

    if (isRecording) {
      cameraRef.current.stopRecording();
      return;
    }

    setIsRecording(true);
    setStatusMessage(t('live.recording'));

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 900 });
      setIsRecording(false);

      if (!video?.uri) {
        setErrorMessage(t('live.recordFailed'));
        return;
      }

      setIsSaving(true);
      const mediaPermission = await MediaLibrary.requestPermissionsAsync();
      if (!mediaPermission.granted) {
        setErrorMessage(t('live.mediaPermissionDenied'));
        return;
      }

      await MediaLibrary.saveToLibraryAsync(video.uri);
      setStatusMessage(t('live.savedToCameraRoll'));
    } catch {
      setIsRecording(false);
      setErrorMessage(t('live.recordFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!permissionsRequested) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <ThemedText>{t('live.requestingPermissions')}</ThemedText>
      </View>
    );
  }

  if (!permissionsGranted) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.permissionTitle}>{t('live.permissionsRequired')}</ThemedText>
        <ThemedText style={styles.permissionSubtitle}>{t('live.permissionsHint')}</ThemedText>
        <Button
          title={t('live.retryPermissions')}
          onPress={() => {
            void (async () => {
              await requestCameraPermission();
              await requestMicPermission();
            })();
          }}
        />
        <Button title={t('live.back')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GestureDetector gesture={pinchGesture}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          mode="video"
          facing={facing}
          zoom={zoom}
          enableTorch={facing === 'back' && torchOn}
        />
      </GestureDetector>

      <LiveLyricsOverlay
        contentTopInset={headerOffset}
        durationSeconds={lyrics?.durationSeconds}
        isLoading={lyricsLoading}
        isUnavailable={lyricsUnavailable}
        plainLyrics={lyrics?.plainLyrics}
        syncedLines={lyrics?.syncedLines}
      />

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBarLeading}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>{t('live.back')}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('live.flipCamera')}
            accessibilityRole="button"
            disabled={isRecording}
            onPress={() => {
              setFacing((current) => (current === 'back' ? 'front' : 'back'));
            }}
            style={[styles.iconButton, styles.iconButtonRound, isRecording && styles.iconButtonDisabled]}>
            <Text style={styles.iconGlyph}>⟲</Text>
          </Pressable>
        </View>

        <Text style={styles.songLabel} numberOfLines={1}>
          {title} · {artist}
        </Text>

        <Pressable
          accessibilityLabel={torchOn ? t('live.flashOn') : t('live.flashOff')}
          accessibilityRole="button"
          disabled={facing === 'front'}
          onPress={() => {
            setTorchOn((current) => !current);
          }}
          style={[
            styles.iconButton,
            styles.iconButtonRound,
            torchOn && styles.iconButtonActive,
            facing === 'front' && styles.iconButtonDisabled,
          ]}>
          <Text style={[styles.iconGlyph, torchOn && styles.iconGlyphActive]}>⚡</Text>
        </Pressable>
      </View>

      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => {
            void handleToggleRecording();
          }}
          style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
          <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
        </Pressable>
        <Text style={styles.recordLabel}>
          {isSaving
            ? t('live.saving')
            : isRecording
              ? t('live.stopRecording')
              : t('live.startRecording')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomControls: {
    alignItems: 'center',
    bottom: 0,
    gap: 6,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  errorMessage: {
    color: '#ffb4b4',
    textAlign: 'center',
  },
  iconButton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 214, 10, 0.35)',
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  iconButtonRound: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 0,
    width: 40,
  },
  iconButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  iconGlyph: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  iconGlyphActive: {
    color: '#ffe566',
  },
  permissionSubtitle: {
    opacity: 0.75,
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  recordButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: '#fff',
    borderRadius: 32,
    borderWidth: 3,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  recordButtonActive: {
    borderColor: '#ff4d4f',
  },
  recordInner: {
    backgroundColor: '#ff4d4f',
    borderRadius: 999,
    height: 44,
    width: 44,
  },
  recordInnerActive: {
    borderRadius: 6,
    height: 22,
    width: 22,
  },
  recordLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  root: {
    backgroundColor: '#000',
    flex: 1,
  },
  songLabel: {
    color: '#fff',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusMessage: {
    color: '#b8ffb8',
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  topBarLeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
