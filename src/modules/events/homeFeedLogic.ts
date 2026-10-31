import type { Show } from './types';

import {
  HOME_FEED_MAX_ITEMS,
  HOME_FEED_TYPE_ORDER,
  type HomeFeedItem,
  type HomeFeedItemType,
  type HomeFeedRawData,
} from './homeFeedTypes';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NEW_SHOW_DAYS = 14;
const TOUR_SETLIST_DAYS = 7;
const MIN_GOING_COUNT_BROADCAST = 3;
const MIN_USER_SOURCE_GOING = 2;

function showLocalYmd(show: Show): string {
  if (show.local_date?.trim()) return show.local_date.trim();
  return show.show_date.slice(0, 10);
}

function isFutureShow(show: Show, now: Date): boolean {
  return new Date(show.show_date).getTime() >= now.getTime();
}

function yearsAgoOnSameMonthDay(show: Show, now: Date): number | null {
  const ymd = showLocalYmd(show);
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return null;

  const todayMonth = now.getMonth() + 1;
  const todayDay = now.getDate();
  if (month !== todayMonth || day !== todayDay) return null;

  const years = now.getFullYear() - year;
  if (years < 1) return null;
  return years;
}

function withinDays(iso: string, now: Date, days: number): boolean {
  const created = new Date(iso).getTime();
  return now.getTime() - created <= days * MS_PER_DAY;
}

function sortFeedItems(items: HomeFeedItem[]): HomeFeedItem[] {
  return [...items].sort((a, b) => {
    const typeDiff = HOME_FEED_TYPE_ORDER[a.type] - HOME_FEED_TYPE_ORDER[b.type];
    if (typeDiff !== 0) return typeDiff;
    return new Date(b.referenceAt).getTime() - new Date(a.referenceAt).getTime();
  });
}

export function buildHomeFeed(raw: HomeFeedRawData): HomeFeedItem[] {
  const now = new Date(raw.nowIso);
  const dismissed = new Set(raw.dismissedIds);
  const marked = new Set(raw.markedShowIds);
  const followed = new Set(raw.followedArtistIds);
  const items: HomeFeedItem[] = [];

  for (const show of raw.userAttendedShows) {
    const yearsAgo = yearsAgoOnSameMonthDay(show, now);
    if (yearsAgo == null) continue;
    const id = `one_year_ago:${show.id}`;
    items.push({
      id,
      type: 'one_year_ago',
      targetShowId: show.id,
      artistImageUrl: show.artist.image_url,
      referenceAt: show.show_date,
      payload: {
        kind: 'one_year_ago',
        artistName: show.artist.name,
        venueName: show.venue.name,
        yearsAgo,
      },
    });
  }

  for (const show of raw.candidateNewConcerts) {
    if (!isFutureShow(show, now)) continue;
    if (!followed.has(show.artist_id)) continue;
    if (marked.has(show.id)) continue;
    if (!withinDays(show.created_at, now, NEW_SHOW_DAYS)) continue;

    const count = raw.goingCounts[show.id] ?? 0;
    if (show.source === 'user' && count < MIN_USER_SOURCE_GOING) continue;

    items.push({
      id: `new_concert:${show.id}`,
      type: 'new_concert',
      targetShowId: show.id,
      artistImageUrl: show.artist.image_url,
      referenceAt: show.created_at,
      payload: { kind: 'new_concert', artistName: show.artist.name },
    });
  }

  for (const candidate of raw.tourSetlistCandidates) {
    const id = `tour_setlist:${candidate.pastShow.id}:${candidate.userGoingShowId}`;
    items.push({
      id,
      type: 'tour_setlist',
      targetShowId: candidate.pastShow.id,
      artistImageUrl: candidate.pastShow.artist.image_url,
      referenceAt: candidate.pastShow.show_date,
      payload: {
        kind: 'tour_setlist',
        city: candidate.pastShow.venue.city,
        songCount: candidate.songCount,
      },
    });
  }

  for (const show of raw.userGoingShows) {
    if (!isFutureShow(show, now)) continue;
    const count = raw.goingCounts[show.id] ?? 0;
    if (count < MIN_GOING_COUNT_BROADCAST) continue;
    items.push({
      id: `going_count:${show.id}`,
      type: 'going_count',
      targetShowId: show.id,
      artistImageUrl: show.artist.image_url,
      referenceAt: now.toISOString(),
      payload: { kind: 'going_count', count },
    });
  }

  return sortFeedItems(items.filter((item) => !dismissed.has(item.id))).slice(
    0,
    HOME_FEED_MAX_ITEMS
  );
}

export function isTourShowWithinLookback(showDateIso: string, now: Date): boolean {
  const showTime = new Date(showDateIso).getTime();
  const nowTime = now.getTime();
  if (showTime >= nowTime) return false;
  return nowTime - showTime <= TOUR_SETLIST_DAYS * MS_PER_DAY;
}
