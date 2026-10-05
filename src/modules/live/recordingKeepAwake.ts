import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

export const RECORDING_KEEP_AWAKE_TAG = 'encore-recording';

export type KeepAwakeResult =
  | { ok: true }
  | { ok: false; error: string };

export function isLiveDiagnosticsEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_LIVE_DIAGNOSTICS?.trim().toLowerCase();
  return flag === 'true' || flag === '1';
}

export async function activateRecordingKeepAwake(): Promise<KeepAwakeResult> {
  try {
    await activateKeepAwakeAsync(RECORDING_KEEP_AWAKE_TAG);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function deactivateRecordingKeepAwake(): KeepAwakeResult {
  try {
    deactivateKeepAwake(RECORDING_KEEP_AWAKE_TAG);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
