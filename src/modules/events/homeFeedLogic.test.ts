import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Show } from './types';

import { buildHomeFeed, isTourShowWithinLookback } from './homeFeedLogic';
import type { HomeFeedRawData } from './homeFeedTypes';

function baseShow(overrides: Partial<Show> = {}): Show {
  return {
    id: 'show-1',
    artist_id: 'artist-1',
    tour_id: null,
    venue_id: 'venue-1',
    show_date: '2026-12-01T03:00:00.000Z',
    created_at: '2026-10-28T00:00:00.000Z',
    setlistfm_id: null,
    source: 'setlistfm',
    artist: {
      id: 'artist-1',
      name: 'Zoé',
      image_url: null,
      genres: null,
    },
    venue: {
      id: 'venue-1',
      name: 'Auditorio Nacional',
      city: 'CDMX',
      country: 'MX',
      lat: null,
      lng: null,
      capacity: null,
    },
    ...overrides,
  };
}

describe('buildHomeFeed', () => {
  const nowIso = '2026-10-31T12:00:00.000Z';

  it('orders types and caps at 8 items', () => {
    const raw: HomeFeedRawData = {
      nowIso,
      dismissedIds: [],
      followedArtistIds: ['artist-1'],
      markedShowIds: [],
      userGoingShows: [],
      userAttendedShows: [
        baseShow({
          id: 'past-1',
          show_date: '2025-10-31T03:00:00.000Z',
          local_date: '2025-10-31',
        }),
      ],
      candidateNewConcerts: [
        baseShow({ id: 'new-1', created_at: '2026-10-25T00:00:00.000Z' }),
      ],
      goingCounts: { 'new-1': 0, 'going-1': 5 },
      tourSetlistCandidates: [],
    };

    raw.userGoingShows = [
      baseShow({ id: 'going-1', show_date: '2026-11-15T03:00:00.000Z' }),
    ];

    const items = buildHomeFeed(raw);
    assert.equal(items.length, 3);
    assert.equal(items[0]?.type, 'one_year_ago');
    assert.equal(items[1]?.type, 'new_concert');
    assert.equal(items[2]?.type, 'going_count');
  });

  it('skips user-sourced new concerts below going threshold', () => {
    const raw: HomeFeedRawData = {
      nowIso,
      dismissedIds: [],
      followedArtistIds: ['artist-1'],
      markedShowIds: [],
      userGoingShows: [],
      userAttendedShows: [],
      candidateNewConcerts: [
        baseShow({
          id: 'user-show',
          source: 'user',
          created_at: '2026-10-29T00:00:00.000Z',
        }),
      ],
      goingCounts: { 'user-show': 1 },
      tourSetlistCandidates: [],
    };
    assert.equal(buildHomeFeed(raw).length, 0);

    raw.goingCounts['user-show'] = 2;
    assert.equal(buildHomeFeed(raw).length, 1);
  });

  it('respects dismissed ids', () => {
    const raw: HomeFeedRawData = {
      nowIso,
      dismissedIds: ['going_count:going-1'],
      followedArtistIds: [],
      markedShowIds: [],
      userGoingShows: [
        baseShow({ id: 'going-1', show_date: '2026-11-15T03:00:00.000Z' }),
      ],
      userAttendedShows: [],
      candidateNewConcerts: [],
      goingCounts: { 'going-1': 4 },
      tourSetlistCandidates: [],
    };
    assert.equal(buildHomeFeed(raw).length, 0);
  });
});

describe('isTourShowWithinLookback', () => {
  it('accepts shows in the last 7 days only', () => {
    const now = new Date('2026-10-31T12:00:00.000Z');
    assert.equal(isTourShowWithinLookback('2026-10-28T03:00:00.000Z', now), true);
    assert.equal(isTourShowWithinLookback('2026-10-20T03:00:00.000Z', now), false);
    assert.equal(isTourShowWithinLookback('2026-11-01T03:00:00.000Z', now), false);
  });
});
