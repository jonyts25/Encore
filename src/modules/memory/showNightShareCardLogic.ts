import type { ShowMediaRow } from '@/modules/events/showMediaTypes';
import { photosLibraryAssetUri } from '@/modules/events/showNightLogic';
import type { Show } from '@/modules/events/types';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { computePredictionAccuracy } from './predictionAccuracyLogic';
import type { ShowMemory } from './types';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

export type ShowNightShareCardModel = {
  artistName: string;
  venueLine: string;
  backgroundUri: string | null;
  fallbackArtistImageUrl: string | null;
  rating: number | null;
  highlightTitles: string[];
  prediction: { hits: number; total: number } | null;
  liveSongCount: number | null;
};

function localeTag(locale: string): string {
  return locale.startsWith('en') ? 'en-US' : 'es-MX';
}

export function formatShareCardShowDate(showDate: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(showDate));
}

export function formatShareCardVenueLine(show: Show, locale: string): string {
  const datePart = formatShareCardShowDate(show.show_date, locale);
  return `${show.venue.name} · ${show.venue.city} · ${datePart}`;
}

export function pickShareCardBackgroundUri(media: ShowMediaRow[]): string | null {
  const video = media.find((row) => row.media_type === 'video');
  if (video) return photosLibraryAssetUri(video.asset_id);
  const photo = media.find((row) => row.media_type === 'photo');
  if (photo) return photosLibraryAssetUri(photo.asset_id);
  return null;
}

export function buildShowNightShareCardModel(
  show: Show,
  memory: ShowMemory | null,
  media: ShowMediaRow[],
  prediction: SetlistPrediction | null,
  locale: string
): ShowNightShareCardModel {
  const confirmed = Boolean(memory?.setlist_confirmed_at);
  const playedSongs = memory?.songs ?? [];

  const liveSongCount =
    confirmed && playedSongs.length > 0 ? playedSongs.length : null;

  const highlightTitles = confirmed
    ? playedSongs.filter((song) => song.is_highlight).map((song) => song.title).slice(0, 3)
    : [];

  let predictionScore: { hits: number; total: number } | null = null;
  if (confirmed && prediction && prediction.songs.length > 0) {
    const predictedIds = prediction.songs.map((song) => song.song_id);
    const confirmedIds = playedSongs.map((song) => song.song_id);
    const accuracy = computePredictionAccuracy(predictedIds, confirmedIds);
    if (accuracy.total > 0) {
      predictionScore = accuracy;
    }
  }

  const rating =
    confirmed && memory?.rating != null && memory.rating >= 1 && memory.rating <= 5
      ? memory.rating
      : null;

  return {
    artistName: show.artist.name,
    venueLine: formatShareCardVenueLine(show, locale),
    backgroundUri: pickShareCardBackgroundUri(media),
    fallbackArtistImageUrl: show.artist.image_url,
    rating,
    highlightTitles,
    prediction: predictionScore,
    liveSongCount,
  };
}
