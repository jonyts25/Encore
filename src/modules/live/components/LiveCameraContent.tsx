import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@/core/i18n';
import { Button, ThemedText } from '@/core/ui/Themed';
import { useLyrics } from '@/modules/lyrics';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';

import type { LiveFloatingHeight, LiveLayoutMode, LiveZoomPreset } from '../types';
import { LiveFloatingLyrics } from './LiveFloatingLyrics';
import { LiveLayoutMenu } from './LiveLayoutMenu';
import { LiveLyricsOverlay } from './LiveLyricsOverlay';
import { LiveSongPickerModal } from './LiveSongPickerModal';
import { LiveZoomChips, zoomPresetToValue } from './LiveZoomChips';

type LiveCameraContentProps = {
  artist: string;
  title: string;
  showId?: string;
};

const TOP_BAR_CONTENT_HEIGHT = 44;

function sortSongsForPicker<T extends { title: string; confidence: number | null }>(songs: T[]) {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

export function LiveCameraContent({ artist, title, showId }: LiveCameraContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torchOn, setTorchOn] = useState(false);
  const [flashTip, setFlashTip] = useState<string | null>(null);
  const flashTipShownRef = useRef(false);

  const [zoomPreset, setZoomPreset] = useState<LiveZoomPreset>(1);
  const [layoutMode, setLayoutMode] = useState<LiveLayoutMode>('overlay');
  const [lyricsVisible, setLyricsVisible] = useState(true);
  const [floatingHeight, setFloatingHeight] = useState<LiveFloatingHeight>(200);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [songPickerOpen, setSongPickerOpen] = useState(false);

  const [activeTitle, setActiveTitle] = useState(title);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { prediction } = useShowPrediction(showId ?? '', { enabled: Boolean(showId) });
  const pickerSongs = useMemo(
    () => sortSongsForPicker(prediction?.songs ?? []),
    [prediction?.songs]
  );

  useEffect(() => {
    if (title.trim()) {
      setActiveTitle(title);
    }
  }, [title]);

  useEffect(() => {
    if (!title.trim() && pickerSongs[0]?.title) {
      setActiveTitle(pickerSongs[0].title);
    }
  }, [title, pickerSongs]);

  const { lyrics, isLoading: lyricsLoading, error: lyricsError, notFound } = useLyrics(
    artist,
    activeTitle
  );

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

  useEffect(() => {
    if (!flashTip) return undefined;
    const timeoutId = setTimeout(() => {
      setFlashTip(null);
    }, 4500);
    return () => clearTimeout(timeoutId);
  }, [flashTip]);

  const handleToggleTorch = () => {
    if (facing === 'front') return;

    setTorchOn((current) => {
      const next = !current;
      if (next && !flashTipShownRef.current) {
        flashTipShownRef.current = true;
        setFlashTip(t('live.flashTip'));
      }
      return next;
    });
  };

  const permissionsGranted = Boolean(cameraPermission?.granted && micPermission?.granted);
  const lyricsUnavailable = Boolean(lyricsError || notFound || !lyrics);
  const headerOffset = insets.top + TOP_BAR_CONTENT_HEIGHT;
  const showLyricsPanel = lyricsVisible;
  const lyricsProps = {
    contentTopInset: headerOffset,
    durationSeconds: lyrics?.durationSeconds,
    isLoading: lyricsLoading,
    isUnavailable: lyricsUnavailable,
    plainLyrics: lyrics?.plainLyrics,
    syncedLines: lyrics?.syncedLines,
  };

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

  const cameraNode = (
    <CameraView
      ref={cameraRef}
      style={layoutMode === 'split' ? StyleSheet.absoluteFill : StyleSheet.absoluteFill}
      mode="video"
      facing={facing}
      enableTorch={facing === 'back' && torchOn}
      zoom={zoomPresetToValue(zoomPreset)}
    />
  );

  return (
    <View style={styles.root}>
      {layoutMode === 'split' ? (
        <View style={styles.splitCameraPane}>{cameraNode}</View>
      ) : (
        cameraNode
      )}

      {showLyricsPanel && layoutMode === 'overlay' ? (
        <LiveLyricsOverlay {...lyricsProps} layout="overlay" />
      ) : null}

      {showLyricsPanel && layoutMode === 'split' ? (
        <View style={styles.splitLyricsPane}>
          <LiveLyricsOverlay {...lyricsProps} contentTopInset={12} layout="split" />
        </View>
      ) : null}

      {showLyricsPanel && layoutMode === 'floating' ? (
        <LiveFloatingLyrics
          {...lyricsProps}
          height={floatingHeight}
        />
      ) : null}

      <LiveZoomChips
        preset={zoomPreset}
        topInset={headerOffset}
        onChange={setZoomPreset}
      />

      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}>
          <Text style={styles.iconButtonText}>{t('live.back')}</Text>
        </Pressable>

        <View style={styles.topBarActions}>
          {showId ? (
            <Pressable
              accessibilityLabel={t('live.openSongPicker')}
              accessibilityRole="button"
              onPress={() => setSongPickerOpen(true)}
              style={styles.iconButtonRound}>
              <Text style={styles.iconGlyph}>☰</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityLabel={lyricsVisible ? t('live.hideLyrics') : t('live.showLyrics')}
            accessibilityRole="button"
            onPress={() => setLyricsVisible((current) => !current)}
            style={styles.iconButtonRound}>
            <Text style={styles.iconGlyph}>{lyricsVisible ? '👁' : '🚫'}</Text>
          </Pressable>

          <Pressable
            accessibilityLabel={t('live.openLayoutMenu')}
            accessibilityRole="button"
            onPress={() => setLayoutMenuOpen(true)}
            style={styles.iconButtonRound}>
            <Text style={styles.iconGlyph}>⚙</Text>
          </Pressable>
        </View>
      </View>

      <Text style={[styles.songLabel, { top: insets.top + 8 }]} numberOfLines={1}>
        {activeTitle} · {artist}
      </Text>

      <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
        {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
        {flashTip ? <Text style={styles.flashTip}>{flashTip}</Text> : null}

        <View style={styles.bottomControlRow}>
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

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => {
              void handleToggleRecording();
            }}
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
            <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
          </Pressable>

          <Pressable
            accessibilityLabel={torchOn ? t('live.flashOn') : t('live.flashOff')}
            accessibilityRole="button"
            disabled={facing === 'front'}
            onPress={handleToggleTorch}
            style={[
              styles.iconButton,
              styles.iconButtonRound,
              torchOn && styles.iconButtonActive,
              facing === 'front' && styles.iconButtonDisabled,
            ]}>
            <Text style={[styles.iconGlyph, torchOn && styles.iconGlyphActive]}>⚡</Text>
          </Pressable>
        </View>

        <Text style={styles.recordLabel}>
          {isSaving
            ? t('live.saving')
            : isRecording
              ? t('live.stopRecording')
              : t('live.startRecording')}
        </Text>
      </View>

      <LiveSongPickerModal
        activeTitle={activeTitle}
        songs={pickerSongs}
        visible={songPickerOpen}
        onClose={() => setSongPickerOpen(false)}
        onSelect={setActiveTitle}
      />

      <LiveLayoutMenu
        floatingHeight={floatingHeight}
        layoutMode={layoutMode}
        lyricsVisible={lyricsVisible}
        visible={layoutMenuOpen}
        onClose={() => setLayoutMenuOpen(false)}
        onFloatingHeightChange={setFloatingHeight}
        onLayoutChange={setLayoutMode}
        onLyricsVisibleChange={setLyricsVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bottomControlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 36,
    justifyContent: 'center',
  },
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
  flashTip: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 10,
    color: '#fff6cc',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 16,
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
    fontSize: 12,
    fontWeight: '600',
    left: 96,
    opacity: 0.85,
    position: 'absolute',
    right: 72,
    textAlign: 'center',
    zIndex: 28,
  },
  splitCameraPane: {
    height: '50%',
    overflow: 'hidden',
    position: 'relative',
  },
  splitLyricsPane: {
    bottom: 0,
    height: '50%',
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 12,
  },
  statusMessage: {
    color: '#b8ffb8',
    textAlign: 'center',
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
