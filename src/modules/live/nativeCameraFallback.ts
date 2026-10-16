export function isNativeCameraTransientError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('camera interrupted') || normalized.includes('camera disconnected')
  );
}

export function isNativeCameraPermissionOrDeviceError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('permission') ||
    normalized.includes('no compatible camera') ||
    normalized.includes('unable to add camera')
  );
}

export function shouldFallbackFromNativeCamera(
  message: string,
  hasNativeCameraReady: boolean
): boolean {
  if (isNativeCameraTransientError(message)) return false;
  if (isNativeCameraPermissionOrDeviceError(message)) return true;
  return !hasNativeCameraReady;
}
