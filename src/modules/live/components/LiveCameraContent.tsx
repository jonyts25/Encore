import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText } from '@/core/ui/Themed';
import { LyricsScrollPanel, useLyrics } from '@/modules/lyrics';

type LiveCameraContentProps = {
  artist: string;
  title: string;
};

export function LiveCameraContent({ artist, title }: LiveCameraContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [permissionsRequested, setPermissionsRequested] = useState(false);

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

  const permissionsGranted = Boolean(cameraPermission?.granted && micPermission?.granted);

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
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} mode="video" facing="back" />

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{t('live.back')}</Text>
        </Pressable>
        <Text style={styles.songLabel} numberOfLines={1}>
          {title} · {artist}
        </Text>
      </View>

      <View style={styles.overlayStrip}>
        {lyricsLoading ? (
          <Text style={styles.overlayMessage}>{t('common.loading')}</Text>
        ) : null}

        {!lyricsLoading && (lyricsError || notFound || !lyrics) ? (
          <Text style={styles.overlayMessage}>{t('live.lyricsUnavailable')}</Text>
        ) : null}

        {!lyricsLoading && lyrics ? (
          <LyricsScrollPanel
            compact
            showModeLabel={false}
            variant="overlay"
            durationSeconds={lyrics.durationSeconds}
            plainLyrics={lyrics.plainLyrics}
            syncedLines={lyrics.syncedLines}
            style={styles.overlayPanel}
          />
        ) : null}
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
  backButton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bottomControls: {
    alignItems: 'center',
    bottom: 0,
    gap: 10,
    left: 0,
    position: 'absolute',
    right: 0,
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
  overlayMessage: {
    color: '#fff',
    padding: 16,
    textAlign: 'center',
  },
  overlayPanel: {
    flex: 1,
  },
  overlayStrip: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    bottom: '18%',
    height: '22%',
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
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
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  recordButtonActive: {
    borderColor: '#ff4d4f',
  },
  recordInner: {
    backgroundColor: '#ff4d4f',
    borderRadius: 999,
    height: 56,
    width: 56,
  },
  recordInnerActive: {
    borderRadius: 8,
    height: 28,
    width: 28,
  },
  recordLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  root: {
    backgroundColor: '#000',
    flex: 1,
  },
  songLabel: {
    color: '#fff',
    flex: 1,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusMessage: {
    color: '#b8ffb8',
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
