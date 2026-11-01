import * as MediaLibrary from 'expo-media-library/legacy';

import { getShowNightSearchWindow } from './showNightLogic';
import type { Show } from './types';

const PAGE_SIZE = 60;

export type ShowNightLibraryAsset = MediaLibrary.Asset;

/** Loads camera-roll assets for the show night time window (same as Tu noche search). */
export async function fetchShowNightLibraryAssets(show: Show, limit = 500): Promise<ShowNightLibraryAsset[]> {
  const searchWindow = getShowNightSearchWindow(show);
  const collected: ShowNightLibraryAsset[] = [];
  let endCursor: string | undefined;
  let hasNext = true;

  while (hasNext && collected.length < limit) {
    const page = await MediaLibrary.getAssetsAsync({
      first: PAGE_SIZE,
      after: endCursor,
      mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      createdAfter: searchWindow.createdAfter,
      createdBefore: searchWindow.createdBefore,
    });
    collected.push(...page.assets);
    hasNext = page.hasNextPage;
    endCursor = page.endCursor;
  }

  return collected;
}
