import { SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './showNightShareCardLogic';

export const SHARE_STORY_SAFE_TOP = 250;
export const SHARE_STORY_SAFE_BOTTOM = 250;

export const SHARE_SAFE_CONTENT_HEIGHT =
  SHARE_CARD_HEIGHT - SHARE_STORY_SAFE_TOP - SHARE_STORY_SAFE_BOTTOM;

export const SHARE_CANVAS = {
  width: SHARE_CARD_WIDTH,
  height: SHARE_CARD_HEIGHT,
} as const;

export type ShareLayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function assertRectWithinCanvas(
  rect: ShareLayoutRect,
  canvas: ShareLayoutRect = { x: 0, y: 0, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }
): void {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  if (rect.x < canvas.x || rect.y < canvas.y || right > canvas.width || bottom > canvas.height) {
    throw new Error(
      `Layout overflow: {x:${rect.x},y:${rect.y},w:${rect.width},h:${rect.height}} outside ${canvas.width}x${canvas.height}`
    );
  }
}
