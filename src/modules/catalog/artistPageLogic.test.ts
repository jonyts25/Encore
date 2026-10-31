import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildArtistLiveStats,
  buildArtistUpcomingShows,
  formatArtistLastSeenMonthYear,
} from './artistPageLogic';

function show(id: string, showDate: string): { id: string; show_date: string } {
  return { id, show_date: showDate };
}

describe('artistPageLogic', () => {
  it('orders upcoming as yours then other', () => {
    const merged = buildArtistUpcomingShows(
      [show('y1', '2026-11-01T00:00:00.000Z') as never],
      [show('o1', '2026-12-01T00:00:00.000Z') as never]
    );
    assert.deepEqual(
      merged.map((row) => row.id),
      ['y1', 'o1']
    );
  });

  it('builds live stats from attended shows', () => {
    const stats = buildArtistLiveStats([
      show('a', '2025-01-01T00:00:00.000Z') as never,
      show('b', '2026-10-01T00:00:00.000Z') as never,
    ]);
    assert.equal(stats?.count, 2);
    assert.equal(stats?.lastShow.id, 'b');
  });

  it('formats last seen month year', () => {
    assert.match(formatArtistLastSeenMonthYear('2026-10-15T00:00:00.000Z', 'es'), /2026/i);
  });
});
