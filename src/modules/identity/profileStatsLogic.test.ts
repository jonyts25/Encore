import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeProfileStats } from './profileStatsLogic';

describe('computeProfileStats', () => {
  it('counts attended shows, artists, cities, and active going', () => {
    const now = new Date('2026-10-27T18:00:00.000Z');
    const stats = computeProfileStats({
      attendedShows: [
        {
          artist_id: 'a1',
          venue: { city: 'Guadalajara' },
        },
        {
          artist_id: 'a2',
          venue: { city: 'Guadalajara' },
        },
        {
          artist_id: 'a1',
          venue: { city: 'CDMX' },
        },
      ] as never,
      goingShows: [
        { show_date: '2026-10-28T03:00:00.000Z' },
        { show_date: '2026-10-01T03:00:00.000Z' },
      ] as never,
      now,
    });

    assert.equal(stats.showsAttended, 3);
    assert.equal(stats.distinctArtists, 2);
    assert.equal(stats.distinctCities, 2);
    assert.equal(stats.upcomingGoing, 1);
  });
});
