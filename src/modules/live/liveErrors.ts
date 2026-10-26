import { isLiveDiagnosticsEnabled } from './recordingKeepAwake';

type TranslateFn = (key: string) => string;

type LiveErrorKey =
  | 'photosPermission'
  | 'cameraBusy'
  | 'microphone'
  | 'emptyFile'
  | 'sessionInterrupted'
  | 'saveFailed'
  | 'generic';

function classifyLiveError(message: string): LiveErrorKey {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('photos_permission_denied') ||
    normalized.includes('photo') ||
    normalized.includes('photolibrary') ||
    normalized.includes('nsphoto')
  ) {
    return 'photosPermission';
  }

  if (
    normalized.includes('camera') &&
    (normalized.includes('in use') ||
      normalized.includes('busy') ||
      normalized.includes('occupied') ||
      normalized.includes('unavailable'))
  ) {
    return 'cameraBusy';
  }

  if (normalized.includes('microphone') || normalized.includes('audio')) {
    return 'microphone';
  }

  if (
    normalized.includes('empty_recording_file') ||
    normalized.includes('empty file') ||
    normalized.includes('zero bytes')
  ) {
    return 'emptyFile';
  }

  if (
    normalized.includes('interrupted') ||
    normalized.includes('session') ||
    normalized.includes('background')
  ) {
    return 'sessionInterrupted';
  }

  return 'generic';
}

export function formatLiveError(error: unknown, t: TranslateFn): string {
  const technical = error instanceof Error ? error.message : String(error ?? '');
  const key = classifyLiveError(technical);
  const userMessage = t(`live.errors.${key}`);

  if (isLiveDiagnosticsEnabled() && technical.trim()) {
    return `${userMessage} (${technical})`;
  }

  return userMessage;
}
