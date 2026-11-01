import 'expo-sqlite/localStorage/install';

import type { ShowNightShareTemplateId } from './showNightShareCardLogic';
import type { ShowNightShareMediaKind } from './showNightShareMediaLogic';

export type ShowNightShareFrameTransform = {
  scale: number;
  translateX: number;
  translateY: number;
};

export type ShowNightShareMediaSelection = {
  assetId: string;
  mediaType: ShowNightShareMediaKind;
  videoTimeSec: number;
  frame: ShowNightShareFrameTransform;
};

const DEFAULT_FRAME: ShowNightShareFrameTransform = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

function storageKey(showId: string, template: ShowNightShareTemplateId): string {
  return `encore.showNightShare.media.${showId}.${template}`;
}

export function readShowNightShareMediaSelection(
  showId: string,
  template: ShowNightShareTemplateId
): ShowNightShareMediaSelection | null {
  try {
    const raw = globalThis.localStorage.getItem(storageKey(showId, template));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShowNightShareMediaSelection;
    if (!parsed?.assetId || !parsed.mediaType) return null;
    return {
      assetId: parsed.assetId,
      mediaType: parsed.mediaType,
      videoTimeSec: typeof parsed.videoTimeSec === 'number' ? parsed.videoTimeSec : 0,
      frame: parsed.frame ?? DEFAULT_FRAME,
    };
  } catch {
    return null;
  }
}

export function writeShowNightShareMediaSelection(
  showId: string,
  template: ShowNightShareTemplateId,
  selection: ShowNightShareMediaSelection
): void {
  try {
    globalThis.localStorage.setItem(storageKey(showId, template), JSON.stringify(selection));
  } catch {
    // ignore
  }
}

export function defaultShowNightShareFrame(): ShowNightShareFrameTransform {
  return { ...DEFAULT_FRAME };
}
