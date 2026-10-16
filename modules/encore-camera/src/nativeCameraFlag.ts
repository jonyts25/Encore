export function isNativeCameraOptedOut(
  flag: string | undefined = process.env.EXPO_PUBLIC_USE_NATIVE_CAMERA
): boolean {
  const normalized = flag?.trim().toLowerCase();
  return normalized === 'false' || normalized === '0';
}
