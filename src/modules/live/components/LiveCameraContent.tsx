import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import {
  EncoreMultiCamBackPreview,
  EncoreMultiCamFrontPreview,
  getMultiCamSupport,
  setCameraMode,
  shouldUseEncoreNativeCamera,
  startMultiCamPreview,
  startMultiCamRecording,
  stopMultiCamPreview,
  stopMultiCamRecording,
  type EncoreCameraState,
  type EncoreCameraZoomState,
} from 'encore-camera';
import { Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { finishRecordingSession, startRecordingSession } from '@/core/db/recordingsDb';
import { hapticImpactMedium } from '@/core/haptics';
import { useTranslation } from '@/core/i18n';
import { Glass, GlassIconButton, StatusPill } from '@/core/ui';
import { Button, ThemedText } from '@/core/ui/Themed';
import { useLyrics } from '@/modules/lyrics';
import { useShowPrediction } from '@/modules/setlist/hooks/useShowPrediction';
import type { PredictedSong, SetlistPredictionStructure } from '@/modules/setlist/types';

import { formatLiveError } from '../liveErrors';
import { shouldFallbackFromNativeCamera } from '../nativeCameraFallback';
import {
  notifyRecordingSaveFinished,
  waitForRecordingSave,
} from '../recordingSaveTracker';
import { saveMultiCamRecordings, saveRecordingToCameraRoll } from '../saveRecording';

import { LiveCameraPreview, type LiveCameraPreviewRef } from './LiveCameraPreview';
import { useLiveSession } from '../context/LiveSessionContext';
import { LiveConcertBottomBar } from './LiveConcertBottomBar';
import { LiveConcertLyricsStrip } from './LiveConcertLyricsStrip';
import { LiveZoomDial } from './LiveZoomDial';
import { useLiveHardwareShutter } from '../hooks/useLiveHardwareShutter';
import {
  activateRecordingKeepAwake,
  deactivateRecordingKeepAwake,
  isLiveDiagnosticsEnabled,
} from '../recordingKeepAwake';

type LiveCameraContentProps = {
  artist: string;
  title: string;
  showId?: string;
};

const TOP_BAR_CONTENT_HEIGHT = 44;
const MIN_FREE_STORAGE_BYTES = 1024 ** 3;

const CONFIDENCE_STRUCTURES: SetlistPredictionStructure[] = [
  'mostly_fixed',
  'rotating',
  'no_tour_data_fallback',
];

const FIXED_LENS_CHIPS = [
  { id: 'ultra', label: '.5×' },
  { id: 'wide', label: '1×' },
  { id: 'tele2', label: '2×' },
  { id: 'tele5', label: '5×' },
];

function sortSongsForPicker(songs: PredictedSong[]) {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

function sortSongsBySetlistOrder(songs: PredictedSong[]) {
  return [...songs].sort((a, b) => (a.avg_position ?? 0) - (b.avg_position ?? 0));
}

function buildNativeZoomFactors(state: EncoreCameraState): number[] {
  const factors = [...(state.lensZoomFactors ?? [1])];
  if (state.maxZoom >= 2 && !factors.some((factor) => Math.abs(factor - 2) < 0.05)) {
    factors.push(2);
  }
  return [...new Set(factors)].sort((a, b) => a - b);
}

function formatNativeZoomChip(factor: number): string {
  if (factor < 1) {
    return `${factor.toFixed(1).replace(/^0\./, '.')}×`;
  }
  if (Math.abs(factor - Math.round(factor)) < 0.001) {
    return `${Math.round(factor)}×`;
  }
  return `${factor.toFixed(1)}×`;
}

function selectedNativeZoomFactor(factors: number[], currentZoom: number): number {
  const eligible = factors.filter((factor) => factor <= currentZoom + 0.01);
  return eligible.length > 0 ? eligible[eligible.length - 1] : (factors[0] ?? 1);
}

function zoomChipId(factor: number) {
  return `zoom-${factor}`;
}

function parseZoomChipId(id: string): number | null {
  if (!id.startsWith('zoom-')) return null;
  const value = Number.parseFloat(id.slice(5));
  return Number.isFinite(value) ? value : null;
}

function formatRecordingClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function LiveCameraContent({ artist, title, showId }: LiveCameraContentProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const previewRef = useRef<LiveCameraPreviewRef>(null);
  const isMountedRef = useRef(true);
  const isRecordingRef = useRef(false);
  const activeRecordingIdRef = useRef<string | null>(null);
  const recordingSongTitleRef = useRef(title);
  const wantsNativePreview = shouldUseEncoreNativeCamera();
  const [nativeCameraFailed, setNativeCameraFailed] = useState(false);
  const useNativePreview = wantsNativePreview && !nativeCameraFailed;
  const nativeCameraReadyRef = useRef(false);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === 'active');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [permissionsRequested, setPermissionsRequested] = useState(false);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torchOn, setTorchOn] = useState(false);
  const [flashTip, setFlashTip] = useState<string | null>(null);
  const flashTipShownRef = useRef(false);

  const [zoom, setZoom] = useState(0);
  const [lyricsVisible, setLyricsVisible] = useState(true);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [multiCamActive, setMultiCamActive] = useState(false);
  const [dualVideoAvailable, setDualVideoAvailable] = useState(false);
  const [nativeCameraState, setNativeCameraState] = useState<EncoreCameraState | null>(null);
  const [nativeZoom, setNativeZoom] = useState(1);
  const lastRoundedNativeZoomRef = useRef<number | null>(null);
  const [selectedLensId, setSelectedLensId] = useState<string>('wide');

  const { activeTitle, setActiveTitle } = useLiveSession();
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keepAwakeDiagnostic, setKeepAwakeDiagnostic] = useState<string | null>(null);
  const showKeepAwakeDiagnostic = isLiveDiagnosticsEnabled();

  const { prediction } = useShowPrediction(showId ?? '', { enabled: Boolean(showId) });

  const pickerSongs = useMemo(() => {
    if (!prediction?.songs) return [];
    const showConfidence = CONFIDENCE_STRUCTURES.includes(prediction.structure);
    return showConfidence
      ? sortSongsForPicker(prediction.songs)
      : sortSongsBySetlistOrder(prediction.songs);
  }, [prediction]);

  const updateNativeZoom = (zoom: number) => {
    const rounded = Math.round(zoom * 10) / 10;
    if (lastRoundedNativeZoomRef.current === rounded) return;
    lastRoundedNativeZoomRef.current = rounded;
    setNativeZoom(rounded);
  };

  const lensChips = useMemo(() => {
    if (useNativePreview && nativeCameraState) {
      const factors = buildNativeZoomFactors(nativeCameraState);
      const selectedFactor = selectedNativeZoomFactor(factors, nativeZoom);
      return factors.map((factor) => ({
        id: zoomChipId(factor),
        label:
          factor === selectedFactor
            ? formatNativeZoomChip(nativeZoom)
            : formatNativeZoomChip(factor),
      }));
    }
    return FIXED_LENS_CHIPS;
  }, [nativeCameraState, nativeZoom, useNativePreview]);

  const nativeSelectedLensId = useMemo(() => {
    if (!useNativePreview || !nativeCameraState) return null;
    const factors = buildNativeZoomFactors(nativeCameraState);
    return zoomChipId(selectedNativeZoomFactor(factors, nativeZoom));
  }, [nativeCameraState, nativeZoom, useNativePreview]);

  useEffect(() => {
    if (permissionsRequested && !micPermission?.granted) {
      void requestMicPermission();
    }
  }, [permissionsRequested, micPermission?.granted, requestMicPermission]);

  useEffect(() => {
    recordingSongTitleRef.current = activeTitle;
  }, [activeTitle]);

  useEffect(() => {
    if (title.trim()) {
      setActiveTitle(title);
    }
  }, [title]);

  useEffect(() => {
    if (Platform.OS === 'ios' && useNativePreview) {
      void getMultiCamSupport()
        .then((support) => setDualVideoAvailable(support.isMultiCamSupported))
        .catch(() => setDualVideoAvailable(false));
      return;
    }
    setDualVideoAvailable(false);
  }, [useNativePreview]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingElapsedSeconds(0);
      return undefined;
    }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setRecordingElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

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
    useNativePreview,
  ]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (isRecordingRef.current) {
        try {
          previewRef.current?.stopRecording();
        } catch {
          // Camera may already be torn down during navigation.
        }
      }
      deactivateRecordingKeepAwake();
      if (Platform.OS === 'ios' && multiCamActive) {
        void stopMultiCamPreview().catch(() => undefined);
      }
    };
  }, [multiCamActive]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      setAppIsActive(nextState === 'active');

      if (nextState !== 'background' || !isRecordingRef.current) return;

      try {
        previewRef.current?.stopRecording();
      } catch {
        // Best-effort stop when the app backgrounds during recording.
      }
      deactivateRecordingKeepAwake();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [useNativePreview]);

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

  const handleNativeCameraState = (state: EncoreCameraState) => {
    setNativeCameraState(state);
    setFacing(state.activeCameraPosition === 'front' ? 'front' : 'back');
    setTorchOn(state.torchEnabled);
    updateNativeZoom(state.currentZoom);
  };

  const handleNativeZoomChanged = (zoomState: EncoreCameraZoomState) => {
    updateNativeZoom(zoomState.currentZoom);
  };

  const handleToggleTorch = async () => {
    if (facing === 'front') return;

    if (useNativePreview) {
      try {
        const next = await previewRef.current?.setNativeTorch(!torchOn);
        if (typeof next === 'boolean') {
          setTorchOn(next);
          if (next && !flashTipShownRef.current) {
            flashTipShownRef.current = true;
            setFlashTip(t('live.flashTip'));
          }
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('live.recordFailed'));
      }
      return;
    }

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
  const previewActive = permissionsGranted && appIsActive && !multiCamActive;
  const multiCamPreviewActive = permissionsGranted && appIsActive && multiCamActive;
  const lyricsUnavailable = Boolean(lyricsError || notFound || !lyrics);
  const singleCameraActive = previewActive && !multiCamActive;

  const handleToggleRecordingRef = useRef<() => Promise<void>>(async () => {});

  useLiveHardwareShutter(() => {
    void handleToggleRecordingRef.current();
  }, Platform.OS === 'ios' && permissionsGranted);
  const showLyricsPanel = lyricsVisible;

  const handleNativeZoomDial = useCallback((factor: number) => {
    void previewRef.current?.setNativeZoom(factor);
  }, []);

  const handleSelectDualVideo = async (enabled: boolean) => {
    if (Platform.OS !== 'ios' || !useNativePreview) {
      setErrorMessage(t('live.multiCamUnavailable'));
      return;
    }

    if (enabled === multiCamActive) return;

    setErrorMessage(null);
    setStatusMessage(null);

    if (!enabled) {
      try {
        await stopMultiCamPreview();
        await setCameraMode('single');
        setMultiCamActive(false);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('live.multiCamFailed'));
      }
      return;
    }

    try {
      await setCameraMode('multiCamPreview');
      setMultiCamActive(true);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      await startMultiCamPreview();
    } catch (error) {
      await setCameraMode('single').catch(() => undefined);
      setMultiCamActive(false);
      setErrorMessage(error instanceof Error ? error.message : t('live.multiCamFailed'));
    }
  };

  const applyKeepAwakeDiagnostic = (result: { ok: true } | { ok: false; error: string }) => {
    if (!showKeepAwakeDiagnostic || !isMountedRef.current) return;
    setKeepAwakeDiagnostic(result.ok ? 'Pantalla activa ✓' : result.error);
  };

  const releaseRecordingKeepAwake = () => {
    const result = deactivateRecordingKeepAwake();
    if (!showKeepAwakeDiagnostic || !isMountedRef.current) return;
    if (!result.ok) {
      setKeepAwakeDiagnostic(result.error);
      return;
    }
    if (!isRecordingRef.current) {
      setKeepAwakeDiagnostic(null);
    }
  };

  const beginRecordingSession = useCallback(async () => {
    try {
      const id = await startRecordingSession({
        showId: showId ?? null,
        songTitle: recordingSongTitleRef.current,
      });
      activeRecordingIdRef.current = id;
    } catch {
      activeRecordingIdRef.current = null;
    }
  }, [showId]);

  const finalizeRecordingSession = useCallback(async (saved: boolean) => {
    const recordingId = activeRecordingIdRef.current;
    activeRecordingIdRef.current = null;
    if (!recordingId) return;
    try {
      await finishRecordingSession({ recordingId, saved });
    } catch {
      // Local log only; save to camera roll already attempted.
    }
  }, []);

  const persistRecordingToCameraRoll = useCallback(
    async (uri: string) => {
      const target = useNativePreview ? 'native' : 'expo';
      if (isMountedRef.current) {
        setIsSaving(true);
      }
      try {
        await saveRecordingToCameraRoll(uri, target);
        await finalizeRecordingSession(true);
        if (isMountedRef.current) {
          setStatusMessage(t('live.savedToCameraRoll'));
        }
      } catch (error) {
        await finalizeRecordingSession(false);
        if (isMountedRef.current) {
          setErrorMessage(formatLiveError(error, t));
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
        notifyRecordingSaveFinished();
      }
    },
    [finalizeRecordingSession, t, useNativePreview]
  );

  const persistMultiCamToCameraRoll = useCallback(
    async (backUri: string, frontUri: string) => {
      if (isMountedRef.current) {
        setIsSaving(true);
      }
      try {
        await saveMultiCamRecordings(backUri, frontUri);
        await finalizeRecordingSession(true);
        if (isMountedRef.current) {
          setStatusMessage(t('live.savedMultiCamToCameraRoll'));
        }
      } catch (error) {
        await finalizeRecordingSession(false);
        if (isMountedRef.current) {
          setErrorMessage(formatLiveError(error, t));
        }
        throw error;
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
        notifyRecordingSaveFinished();
      }
    },
    [finalizeRecordingSession, t]
  );

  const warnIfLowStorage = useCallback(async () => {
    try {
      const free = Paths.availableDiskSpace;
      if (free >= MIN_FREE_STORAGE_BYTES) return;
      if (!isMountedRef.current) return;
      Alert.alert(t('live.lowStorageTitle'), t('live.lowStorageMessage'));
    } catch {
      // Ignore; recording may still succeed.
    }
  }, [t]);

  const handleToggleRecording = async () => {
    if (isSaving) return;

    hapticImpactMedium();
    setErrorMessage(null);
    setStatusMessage(null);

    if (Platform.OS === 'ios' && multiCamActive) {
      if (isRecording || isRecordingRef.current) {
        try {
          const result = await stopMultiCamRecording();
          isRecordingRef.current = false;
          if (isMountedRef.current) {
            setIsRecording(false);
          }
          releaseRecordingKeepAwake();
          await persistMultiCamToCameraRoll(result.backVideoURL, result.frontVideoURL);
        } catch {
          isRecordingRef.current = false;
          releaseRecordingKeepAwake();
          notifyRecordingSaveFinished();
          if (isMountedRef.current) {
            setIsRecording(false);
          }
        }
        return;
      }

      await warnIfLowStorage();
      await beginRecordingSession();
      isRecordingRef.current = true;
      if (isMountedRef.current) {
        setIsRecording(true);
        setStatusMessage(t('live.recording'));
      }
      const keepAwakeResult = await activateRecordingKeepAwake();
      applyKeepAwakeDiagnostic(keepAwakeResult);
      try {
        await startMultiCamRecording();
      } catch (error) {
        isRecordingRef.current = false;
        activeRecordingIdRef.current = null;
        releaseRecordingKeepAwake();
        if (isMountedRef.current) {
          setIsRecording(false);
          setStatusMessage(null);
          setErrorMessage(formatLiveError(error, t));
        }
      }
      return;
    }

    if (!previewRef.current) return;

    if (isRecording || isRecordingRef.current) {
      try {
        previewRef.current.stopRecording();
      } catch {
        isRecordingRef.current = false;
        if (isMountedRef.current) {
          setIsRecording(false);
        }
        releaseRecordingKeepAwake();
      }
      return;
    }

    await warnIfLowStorage();
    await beginRecordingSession();
    isRecordingRef.current = true;
    if (isMountedRef.current) {
      setIsRecording(true);
      setStatusMessage(t('live.recording'));
    }

    const keepAwakeResult = await activateRecordingKeepAwake();
    applyKeepAwakeDiagnostic(keepAwakeResult);

    try {
      const video = await previewRef.current.recordAsync();
      isRecordingRef.current = false;
      if (isMountedRef.current) {
        setIsRecording(false);
      }
      releaseRecordingKeepAwake();

      if (!video?.uri) {
        await finalizeRecordingSession(false);
        notifyRecordingSaveFinished();
        if (isMountedRef.current) {
          setErrorMessage(formatLiveError(new Error('EMPTY_RECORDING_FILE'), t));
        }
        return;
      }

      await persistRecordingToCameraRoll(video.uri);
    } catch (error) {
      isRecordingRef.current = false;
      releaseRecordingKeepAwake();
      await finalizeRecordingSession(false);
      notifyRecordingSaveFinished();
      if (isMountedRef.current) {
        setIsRecording(false);
        setErrorMessage(formatLiveError(error, t));
      }
    }
  };

  handleToggleRecordingRef.current = handleToggleRecording;

  const handleNativeRecordingStarted = async () => {
    isRecordingRef.current = true;
    setIsRecording(true);
    setStatusMessage(t('live.recording'));
    const keepAwakeResult = await activateRecordingKeepAwake();
    applyKeepAwakeDiagnostic(keepAwakeResult);
  };

  const handleNativeRecordingFinished = async (uri: string) => {
    isRecordingRef.current = false;
    if (isMountedRef.current) {
      setIsRecording(false);
      setErrorMessage(null);
      setStatusMessage(null);
    }
    releaseRecordingKeepAwake();

    try {
      await persistRecordingToCameraRoll(uri);
    } catch {
      // Error state set in persistRecordingToCameraRoll when mounted.
    }
  };

  const handleNativeRecordingError = (message: string) => {
    isRecordingRef.current = false;
    releaseRecordingKeepAwake();
    void finalizeRecordingSession(false);
    notifyRecordingSaveFinished();
    if (isMountedRef.current) {
      setIsRecording(false);
      setErrorMessage(formatLiveError(new Error(message), t));
    }
  };

  const handleFlipCamera = async () => {
    if (useNativePreview) {
      try {
        await previewRef.current?.switchNativeCamera();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('live.recordFailed'));
      }
      return;
    }

    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const stopRecordingAndWaitForSave = useCallback(async () => {
    const saveWait = waitForRecordingSave();

    if (Platform.OS === 'ios' && multiCamActive && isRecordingRef.current) {
      try {
        const result = await stopMultiCamRecording();
        isRecordingRef.current = false;
        if (isMountedRef.current) {
          setIsRecording(false);
        }
        releaseRecordingKeepAwake();
        await persistMultiCamToCameraRoll(result.backVideoURL, result.frontVideoURL);
      } catch {
        notifyRecordingSaveFinished();
      }
      await saveWait;
      return;
    }

    if (isRecordingRef.current && previewRef.current) {
      try {
        previewRef.current.stopRecording();
      } catch {
        notifyRecordingSaveFinished();
      }
      await saveWait;
    }
  }, [multiCamActive, persistMultiCamToCameraRoll, releaseRecordingKeepAwake]);

  const handleBackPress = useCallback(() => {
    if (isRecording || isRecordingRef.current) {
      Alert.alert(t('live.exitWhileRecordingTitle'), t('live.exitWhileRecordingMessage'), [
        { text: t('live.keepRecording'), style: 'cancel' },
        {
          text: t('live.stopAndSave'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await stopRecordingAndWaitForSave();
              router.back();
            })();
          },
        },
      ]);
      return;
    }
    router.back();
  }, [isRecording, router, stopRecordingAndWaitForSave, t]);

  const activeSongIndex = useMemo(() => {
    const index = pickerSongs.findIndex((song) => song.title === activeTitle);
    return index >= 0 ? index + 1 : null;
  }, [activeTitle, pickerSongs]);

  const openSongSheet = () => {
    router.push({
      pathname: '/live/songs',
      params: {
        artist,
        showId: showId ?? '',
        activeTitle,
      },
    });
  };

  const handleSelectLens = async (id: string) => {
    if (useNativePreview) {
      const factor = parseZoomChipId(id);
      if (factor === null) return;

      try {
        await previewRef.current?.setNativeZoom(factor);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : t('live.recordFailed'));
      }
      return;
    }

    setSelectedLensId(id);

    setFacing('back');
    if (id === 'ultra') setZoom(0);
    else if (id === 'wide') setZoom(0);
    else if (id === 'tele2') setZoom(0.35);
    else if (id === 'tele5') setZoom(0.65);
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
        <ThemedText style={styles.permissionTitle}>
          {t('live.permissionsRequired')}
        </ThemedText>
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
    <>
      <LiveCameraPreview
        ref={previewRef}
        useNativePreview={useNativePreview}
        active={singleCameraActive}
        facing={facing}
        torchOn={torchOn}
        zoom={zoom}
        style={StyleSheet.absoluteFill}
        onCameraReady={() => {
          nativeCameraReadyRef.current = true;
        }}
        onNativeCameraError={(message) => {
          if (shouldFallbackFromNativeCamera(message, nativeCameraReadyRef.current)) {
            setNativeCameraFailed(true);
            return;
          }
          setStatusMessage(formatLiveError(message, t));
        }}
        onNativeCameraState={useNativePreview ? handleNativeCameraState : undefined}
        onNativeZoomChanged={useNativePreview ? handleNativeZoomChanged : undefined}
        onNativeRecordingStarted={useNativePreview ? handleNativeRecordingStarted : undefined}
        onNativeRecordingFinished={useNativePreview ? handleNativeRecordingFinished : undefined}
        onNativeRecordingError={useNativePreview ? handleNativeRecordingError : undefined}
        onExpoZoomChange={useNativePreview ? undefined : setZoom}
      />
      {useNativePreview && multiCamActive ? (
        <>
          <EncoreMultiCamBackPreview active={multiCamPreviewActive} style={StyleSheet.absoluteFill} />
          <EncoreMultiCamFrontPreview active={multiCamPreviewActive} style={styles.multiCamPip} />
        </>
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <View pointerEvents="auto" style={styles.cameraLayer}>
        {cameraNode}
      </View>

      <View pointerEvents="box-none" style={styles.uiOverlay}>
        <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <GlassIconButton
            accessibilityLabel={t('live.exit')}
            icon="close"
            onPress={handleBackPress}
          />
          {isRecording ? (
            <StatusPill label={formatRecordingClock(recordingElapsedSeconds)} tone="recording" />
          ) : (
            <View style={styles.headerSpacer} />
          )}
          <GlassIconButton
            accessibilityLabel={lyricsVisible ? t('live.hideLyrics') : t('live.showLyrics')}
            icon={lyricsVisible ? 'menu' : 'menu-outline'}
            onPress={() => setLyricsVisible((current) => !current)}
          />
        </View>

        <Pressable onPress={openSongSheet} style={styles.songCapsuleWrap}>
          <Glass style={styles.songCapsule}>
            <View style={styles.songCapsuleText}>
              <Text numberOfLines={1} style={styles.songCapsuleTitle}>
                {activeTitle || t('live.pickSong')}
              </Text>
              <Text style={styles.songCapsuleSubtitle}>
                {activeSongIndex && pickerSongs.length
                  ? t('live.songProgress', {
                      current: activeSongIndex,
                      total: pickerSongs.length,
                    })
                  : t('live.songPickerSubtitle')}
              </Text>
            </View>
            <Ionicons color="#FFFFFF" name="chevron-down" size={18} />
          </Glass>
        </Pressable>

        {showKeepAwakeDiagnostic ? (
          <Text
            style={[styles.keepAwakeDiagnostic, { top: insets.top + TOP_BAR_CONTENT_HEIGHT + 4 }]}
            numberOfLines={3}>
            <Text style={styles.keepAwakeDiagnosticOk}>
              {useNativePreview ? t('live.diagnosticsNativeCamera') : t('live.diagnosticsExpoCamera')}
            </Text>
            {keepAwakeDiagnostic ? (
              <>
                {' · '}
                <Text
                  style={
                    keepAwakeDiagnostic === 'Pantalla activa ✓'
                      ? styles.keepAwakeDiagnosticOk
                      : styles.keepAwakeDiagnosticError
                  }>
                  {keepAwakeDiagnostic}
                </Text>
              </>
            ) : null}
          </Text>
        ) : null}

        {showLyricsPanel ? (
          <View pointerEvents="box-none" style={styles.lyricsRegion}>
            <LiveConcertLyricsStrip
              durationSeconds={lyrics?.durationSeconds}
              isLoading={lyricsLoading}
              isUnavailable={lyricsUnavailable}
              plainLyrics={lyrics?.plainLyrics}
              syncedLines={lyrics?.syncedLines}
            />
          </View>
        ) : null}

        <View
          pointerEvents="box-none"
          style={[styles.bottomControls, { paddingBottom: insets.bottom + 12 }]}>
          {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
          {errorMessage ? <Text style={styles.errorMessage}>{errorMessage}</Text> : null}
          {flashTip ? <Text style={styles.flashTip}>{flashTip}</Text> : null}

          <LiveConcertBottomBar
            dualVideoActive={multiCamActive}
            dualVideoAvailable={dualVideoAvailable && useNativePreview}
            flipDisabled={isRecording || multiCamActive}
            isRecording={isRecording}
            isSaving={isSaving}
            lensChips={!useNativePreview && !multiCamActive ? lensChips : []}
            selectedLensId={useNativePreview ? (nativeSelectedLensId ?? 'zoom-1') : selectedLensId}
            torchDisabled={facing === 'front' || multiCamActive}
            torchOn={torchOn}
            zoomControl={
              useNativePreview && !multiCamActive && nativeCameraState ? (
                <LiveZoomDial
                  currentZoom={nativeZoom}
                  disabled={isRecording}
                  lensFactors={buildNativeZoomFactors(nativeCameraState)}
                  maxZoom={Math.min(nativeCameraState.maxZoom ?? 10, 10)}
                  minZoom={nativeCameraState.minZoom ?? 1}
                  onSetZoom={handleNativeZoomDial}
                />
              ) : undefined
            }
            onFlip={() => {
              void handleFlipCamera();
            }}
            onSelectDualVideo={(enabled) => {
              void handleSelectDualVideo(enabled);
            }}
            onSelectLens={(id) => {
              void handleSelectLens(id);
            }}
            onToggleRecording={() => {
              void handleToggleRecording();
            }}
            onToggleTorch={handleToggleTorch}
          />
        </View>

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
  keepAwakeDiagnostic: {
    fontSize: 11,
    fontWeight: '600',
    left: 16,
    position: 'absolute',
    right: 16,
    textAlign: 'center',
    zIndex: 27,
  },
  keepAwakeDiagnosticError: {
    color: '#ffb4b4',
  },
  keepAwakeDiagnosticOk: {
    color: '#b8ffb8',
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 30,
  },
  headerSpacer: {
    flex: 1,
  },
  songCapsule: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  songCapsuleSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
  songCapsuleTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 240,
  },
  songCapsuleText: {
    alignItems: 'center',
    flexShrink: 1,
  },
  songCapsuleWrap: {
    alignSelf: 'center',
    position: 'absolute',
    top: '12%',
    zIndex: 28,
  },
  lyricsRegion: {
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 8,
    position: 'absolute',
    right: 0,
    top: '22%',
    zIndex: 12,
  },
  multiCamPip: {
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 16,
    borderWidth: 1,
    bottom: 330,
    height: 168,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    width: 112,
    zIndex: 2,
  },
  cameraLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  root: {
    backgroundColor: '#000',
    flex: 1,
  },
  uiOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  statusMessage: {
    color: '#b8ffb8',
    textAlign: 'center',
  },
});
