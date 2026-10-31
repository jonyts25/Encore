import type { Show } from './types';

export type HomeFeedItemType =
  | 'one_year_ago'
  | 'new_concert'
  | 'tour_setlist'
  | 'going_count';

export type HomeFeedItemPayload =
  | { kind: 'one_year_ago'; artistName: string; venueName: string; yearsAgo: number }
  | { kind: 'new_concert'; artistName: string }
  | { kind: 'tour_setlist'; city: string; songCount: number }
  | { kind: 'going_count'; count: number };

export type HomeFeedItem = {
  id: string;
  type: HomeFeedItemType;
  targetShowId: string;
  artistImageUrl: string | null;
  /** ISO timestamp for relative date label */
  referenceAt: string;
  payload: HomeFeedItemPayload;
};

export type HomeFeedRawData = {
  nowIso: string;
  dismissedIds: string[];
  followedArtistIds: string[];
  markedShowIds: string[];
  userGoingShows: Show[];
  userAttendedShows: Show[];
  candidateNewConcerts: Show[];
  goingCounts: Record<string, number>;
  tourSetlistCandidates: {
    userGoingShowId: string;
    pastShow: Show;
    songCount: number;
  }[];
};

export const HOME_FEED_MAX_ITEMS = 8;

export const HOME_FEED_TYPE_ORDER: Record<HomeFeedItemType, number> = {
  one_year_ago: 0,
  new_concert: 1,
  tour_setlist: 2,
  going_count: 3,
};
