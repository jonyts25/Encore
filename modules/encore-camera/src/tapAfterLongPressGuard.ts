/** Mirrors EncoreCameraView tap suppression after long-press release (seconds → ms). */
export const TAP_SUPPRESS_AFTER_LONG_PRESS_MS = 350;

export function shouldSuppressTapAfterLongPress(
  longPressEndedAtMs: number | null,
  tapAtMs: number,
  windowMs: number = TAP_SUPPRESS_AFTER_LONG_PRESS_MS
): boolean {
  if (longPressEndedAtMs === null) return false;
  return tapAtMs - longPressEndedAtMs < windowMs;
}
