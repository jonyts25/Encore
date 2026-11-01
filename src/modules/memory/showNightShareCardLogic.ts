import type { ShowMediaRow } from '@/modules/events/showMediaTypes';
import type { Show } from '@/modules/events/types';
import type { SetlistPrediction } from '@/modules/setlist/types';

import type { ShowMemory } from './types';

export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

export type ShowNightShareTemplateId = 'boleto' | 'setlist' | 'poster';

export type ShowNightShareSongItem = {
  songId: string;
  title: string;
  position: number;
  is_encore: boolean;
  is_highlight: boolean;
};

export type ShowNightShareCardModel = {
  showId: string;
  artistName: string;
  tourName: string | null;
  venueName: string;
  city: string;
  venueCityLine: string;
  posterDateLabel: string;
  ticketDateLabel: string;
  fallbackArtistImageUrl: string | null;
  rating: number | null;
  liveSongCount: number | null;
  confirmedSongs: ShowNightShareSongItem[];
  hasConfirmedSetlist: boolean;
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

export function formatShareCardPosterDate(showDate: string): string {
  const d = new Date(showDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

export function formatShareCardTicketDate(showDate: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(showDate));
}

export function formatShareCardVenueLine(show: Show, locale: string): string {
  const datePart = formatShareCardShowDate(show.show_date, locale);
  return `${show.venue.name} · ${show.venue.city} · ${datePart}`;
}

export function formatShareCardVenueCityLine(show: Show): string {
  return `${show.venue.name} · ${show.venue.city}`;
}

/** Decorative barcode bar widths (2–5 px at 1080 scale) derived from show id. */
export function decorativeBarcodeBarWidths(showId: string, barCount = 48): number[] {
  let hash = 2166136261;
  for (let i = 0; i < showId.length; i++) {
    hash ^= showId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    bars.push(2 + (Math.abs(hash) % 4));
  }
  return bars;
}

export function availableShowNightShareTemplates(
  model: Pick<ShowNightShareCardModel, 'hasConfirmedSetlist' | 'confirmedSongs'>
): ShowNightShareTemplateId[] {
  const templates: ShowNightShareTemplateId[] = ['boleto'];
  if (model.hasConfirmedSetlist && model.confirmedSongs.length > 0) {
    templates.push('setlist');
  }
  templates.push('poster');
  return templates;
}

export function buildShowNightShareCardModel(
  show: Show,
  memory: ShowMemory | null,
  _media: ShowMediaRow[],
  _prediction: SetlistPrediction | null,
  locale: string
): ShowNightShareCardModel {
  const confirmed = Boolean(memory?.setlist_confirmed_at);
  const playedSongs = memory?.songs ?? [];
  const sortedSongs = [...playedSongs].sort((a, b) => a.position - b.position);

  const liveSongCount =
    confirmed && playedSongs.length > 0 ? playedSongs.length : null;

  const rating =
    confirmed && memory?.rating != null && memory.rating >= 1 && memory.rating <= 5
      ? memory.rating
      : null;

  const confirmedSongs: ShowNightShareSongItem[] = confirmed
    ? sortedSongs.map((song) => ({
        songId: song.song_id,
        title: song.title,
        position: song.position,
        is_encore: song.is_encore,
        is_highlight: song.is_highlight,
      }))
    : [];

  return {
    showId: show.id,
    artistName: show.artist.name,
    tourName: null,
    venueName: show.venue.name,
    city: show.venue.city,
    venueCityLine: formatShareCardVenueCityLine(show),
    posterDateLabel: formatShareCardPosterDate(show.show_date),
    ticketDateLabel: formatShareCardTicketDate(show.show_date, locale),
    fallbackArtistImageUrl: show.artist.image_url,
    rating,
    liveSongCount,
    confirmedSongs,
    hasConfirmedSetlist: confirmed && confirmedSongs.length > 0,
  };
}
