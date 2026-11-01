import type { ShowMediaRow } from '@/modules/events/showMediaTypes';
import { photosLibraryAssetUri } from '@/modules/events/showNightLogic';

export type ShowNightShareMediaKind = 'photo' | 'video';

export type ShowNightShareMediaPick = {
  assetId: string;
  mediaType: ShowNightShareMediaKind;
  takenAt: string;
};

/** Default: first photo; if only videos, median by taken_at. */
export function pickDefaultShareNightMedia(media: ShowMediaRow[]): ShowNightShareMediaPick | null {
  if (media.length === 0) return null;

  const photos = media
    .filter((row) => row.media_type === 'photo')
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  if (photos.length > 0) {
    const first = photos[0]!;
    return {
      assetId: first.asset_id,
      mediaType: 'photo',
      takenAt: first.taken_at,
    };
  }

  const videos = media
    .filter((row) => row.media_type === 'video')
    .sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  if (videos.length === 0) return null;

  const mid = videos[Math.floor(videos.length / 2)]!;
  return {
    assetId: mid.asset_id,
    mediaType: 'video',
    takenAt: mid.taken_at,
  };
}

export function shareNightPhUri(assetId: string): { uri: string } {
  return { uri: photosLibraryAssetUri(assetId) };
}

export function findMediaRow(media: ShowMediaRow[], assetId: string): ShowMediaRow | null {
  return media.find((row) => row.asset_id === assetId) ?? null;
}
