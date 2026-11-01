import 'expo-sqlite/localStorage/install';

import type { ImageContentPosition } from 'expo-image';

import type { ShowNightShareMediaKind } from './showNightShareMediaLogic';

export type ShowNightShareContentAnchor = 'top' | 'center' | 'bottom';

export type ShowNightShareMediaPrefs = {
  assetId: string;
  mediaType: ShowNightShareMediaKind;
  contentAnchor: ShowNightShareContentAnchor;
};

const STORAGE_KEY_PREFIX = 'encore.showNightShare.media.v2';

function storageKey(showId: string): string {
  return `${STORAGE_KEY_PREFIX}.${showId}`;
}

export function showNightShareContentPosition(anchor: ShowNightShareContentAnchor): ImageContentPosition {
  if (anchor === 'top') return 'top center';
  if (anchor === 'bottom') return 'bottom center';
  return 'center';
}

export function readShowNightShareMediaPrefs(showId: string): ShowNightShareMediaPrefs | null {
  try {
    const raw = globalThis.localStorage.getItem(storageKey(showId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ShowNightShareMediaPrefs;
    if (!parsed?.assetId || !parsed.mediaType) return null;
    const anchor = parsed.contentAnchor;
    if (anchor !== 'top' && anchor !== 'center' && anchor !== 'bottom') {
      return { ...parsed, contentAnchor: 'center' };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeShowNightShareMediaPrefs(showId: string, prefs: ShowNightShareMediaPrefs): void {
  try {
    globalThis.localStorage.setItem(storageKey(showId), JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function defaultShowNightShareContentAnchor(): ShowNightShareContentAnchor {
  return 'center';
}
