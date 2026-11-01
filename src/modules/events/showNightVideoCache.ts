import * as FileSystem from 'expo-file-system/legacy';

import { guessShowNightVideoExtension } from './showNightLogic';

const CACHE_FOLDER = 'encore-show-night-videos';

function cacheRoot(): string | null {
  const base = FileSystem.cacheDirectory;
  if (!base) return null;
  return `${base}${CACHE_FOLDER}/`;
}

/** Copies a library video into app cache for reliable expo-video playback. */
export async function copyShowNightVideoToCache(
  sourceUri: string,
  assetId: string
): Promise<string> {
  const root = cacheRoot();
  if (!root) {
    throw new Error('cacheDirectory unavailable');
  }

  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const dest = `${root}${assetId}${guessShowNightVideoExtension(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** Removes cached fullscreen videos (call when closing the modal). */
export async function clearShowNightVideoCache(): Promise<void> {
  const root = cacheRoot();
  if (!root) return;
  await FileSystem.deleteAsync(root, { idempotent: true });
}
