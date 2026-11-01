import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  type ShowNightShareCardModel,
  type ShowNightShareTemplateId,
} from './showNightShareCardLogic';
import {
  assertRectWithinCanvas,
  SHARE_STORY_SAFE_BOTTOM,
  SHARE_STORY_SAFE_TOP,
  type ShareLayoutRect,
} from './showNightShareSafeZones';

export const BOLETO_TICKET_FIXED_HEIGHT = 668;
export const BOLETO_HORIZONTAL_PADDING = 48;

const SETLIST_SONG_LINE = 26;
const SETLIST_SONG_LINE_COMPACT = 22;
const SETLIST_HEADER = 120;
const SETLIST_ENCORE_EXTRA = 48;

export function estimateSetlistPaperHeight(songCount: number, hasEncore: boolean): number {
  const twoCol = songCount > 16;
  const line = twoCol ? SETLIST_SONG_LINE_COMPACT : SETLIST_SONG_LINE;
  const rows = twoCol ? Math.ceil(songCount / 2) : songCount;
  const listHeight = rows * (line + 6);
  return SETLIST_HEADER + listHeight + (hasEncore ? SETLIST_ENCORE_EXTRA : 0) + 48;
}

/** Worst-case layout rectangles (canvas coordinates) for automated bounds checks. */
export function estimateTemplateLayoutRects(
  template: ShowNightShareTemplateId,
  model: ShowNightShareCardModel
): ShareLayoutRect[] {
  const rects: ShareLayoutRect[] = [];
  const safeTop = SHARE_STORY_SAFE_TOP;
  const safeBottom = SHARE_STORY_SAFE_BOTTOM;
  const safeHeight = SHARE_CARD_HEIGHT - safeTop - safeBottom;

  rects.push({ x: 0, y: 0, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT });

  if (template === 'boleto') {
    const ticketTop = SHARE_CARD_HEIGHT - safeBottom - BOLETO_TICKET_FIXED_HEIGHT - 40;
    const photoHeight = Math.max(0, ticketTop - safeTop - 28);
    rects.push({
      x: BOLETO_HORIZONTAL_PADDING,
      y: safeTop,
      width: SHARE_CARD_WIDTH - BOLETO_HORIZONTAL_PADDING * 2,
      height: photoHeight,
    });
    rects.push({
      x: BOLETO_HORIZONTAL_PADDING,
      y: ticketTop,
      width: SHARE_CARD_WIDTH - BOLETO_HORIZONTAL_PADDING * 2,
      height: BOLETO_TICKET_FIXED_HEIGHT,
    });
  }

  if (template === 'setlist') {
    const paperHeight = estimateSetlistPaperHeight(model.confirmedSongs.length, model.confirmedSongs.some((s) => s.is_encore));
    const paperY = safeTop + Math.max(0, (safeHeight - paperHeight) / 2);
    rects.push({
      x: 56,
      y: paperY,
      width: SHARE_CARD_WIDTH - 112,
      height: paperHeight,
    });
  }

  if (template === 'poster') {
    rects.push({ x: 0, y: 0, width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT });
    rects.push({
      x: 64,
      y: SHARE_CARD_HEIGHT - safeBottom - 160,
      width: SHARE_CARD_WIDTH - 128,
      height: 140,
    });
  }

  const watermarkY = SHARE_CARD_HEIGHT - safeBottom - 48;
  rects.push({ x: 0, y: watermarkY, width: SHARE_CARD_WIDTH, height: 40 });

  return rects;
}

export function assertTemplateLayoutsWithinCanvas(
  template: ShowNightShareTemplateId,
  model: ShowNightShareCardModel
): void {
  for (const rect of estimateTemplateLayoutRects(template, model)) {
    assertRectWithinCanvas(rect);
  }
}

export function buildStressShowNightShareCardModel(): ShowNightShareCardModel {
  const artist = 'A'.repeat(30);
  const venue = 'V'.repeat(40);
  const songs = Array.from({ length: 30 }, (_, index) => ({
    songId: `song-${index + 1}`,
    title: `Song number ${index + 1} with extra words`,
    position: index + 1,
    is_encore: index >= 27,
    is_highlight: index === 2 || index === 10,
  }));

  return {
    showId: 'stress-show',
    artistName: artist,
    tourName: 'Long tour name example',
    venueName: venue,
    city: 'Ciudad de México',
    venueCityLine: `${venue} · Ciudad de México`,
    posterDateLabel: '30.10.26',
    ticketDateLabel: '30 oct 2026',
    fallbackArtistImageUrl: null,
    rating: 5,
    liveSongCount: 30,
    confirmedSongs: songs,
    hasConfirmedSetlist: true,
  };
}
