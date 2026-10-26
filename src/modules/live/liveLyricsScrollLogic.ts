export const LIVE_LYRICS_LINE_GAP = 4;
export const LIVE_LYRICS_FALLBACK_LINE_HEIGHT = 46;

export function scrollOffsetForActiveLine(
  activeIndex: number,
  lineHeights: number[],
  fallbackLineHeight: number = LIVE_LYRICS_FALLBACK_LINE_HEIGHT,
  pinActiveToTop = false
): number {
  if (activeIndex <= 0) return 0;

  const lineStride = (index: number) =>
    (lineHeights[index] ?? fallbackLineHeight) + LIVE_LYRICS_LINE_GAP;

  if (pinActiveToTop) {
    let offset = 0;
    for (let i = 0; i < activeIndex; i += 1) {
      offset += lineStride(i);
    }
    return offset;
  }

  let offset = 0;
  for (let i = 0; i < activeIndex - 1; i += 1) {
    offset += lineStride(i);
  }
  return offset;
}

export function isTapWithoutScroll(params: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startTimeMs: number;
  endTimeMs: number;
  didScroll: boolean;
}): boolean {
  if (params.didScroll) return false;
  const dx = Math.abs(params.endX - params.startX);
  const dy = Math.abs(params.endY - params.startY);
  if (dx > 12 || dy > 12) return false;
  return params.endTimeMs - params.startTimeMs < 350;
}
