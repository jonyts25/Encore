import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Show } from '@/modules/events/types';

import {
  computeDiscographyStats,
  filterDiscographyEntriesByYear,
  groupDiscographyByMonth,
  listDiscographyYears,
} from './discographyLogic';
import type { DiscographyShowEntry } from './types';

function show(id: string, artistId: string, date: string, city: string, country: string): Show {
  return {
    id,
    artist_id: artistId,
    tour_id: null,
    venue_id: `venue-${id}`,
    show_date: date,
    created_at: date,
    setlistfm_id: null,
    artist: {
      id: artistId,
      name: `Artist ${artistId}`,
      image_url: null,
      genres: null,
    },
    venue: {
      id: `venue-${id}`,
      name: 'Venue',
      city,
      country,
      lat: null,
      lng: null,
      capacity: null,
    },
  };
}

function entry(
  showRow: Show,
  confirmed: boolean,
  songs: number,
  rating: number | null = null
): DiscographyShowEntry {
  return {
    show: showRow,
    memory: {
      memoryId: confirmed ? 'mem-1' : null,
      rating,
      setlistConfirmedAt: confirmed ? '2026-10-01T00:00:00.000Z' : null,
      songsPlayedCount: songs,
    },
    firstMedia: null,
  };
}

describe('discographyLogic', () => {
  const entries: DiscographyShowEntry[] = [
    entry(show('s1', 'a1', '2026-10-05T03:00:00.000Z', 'CDMX', 'MX'), true, 12, 5),
    entry(show('s2', 'a2', '2026-10-12T03:00:00.000Z', 'Guadalajara', 'MX'), false, 0),
    entry(show('s3', 'a1', '2025-06-01T03:00:00.000Z', 'Monterrey', 'MX'), true, 8),
  ];

  it('filters by year and lists years', () => {
    assert.equal(filterDiscographyEntriesByYear(entries, 2026).length, 2);
    assert.deepEqual(listDiscographyYears(entries), [2026, 2025]);
  });

  it('computes stats for a year including favorites seen', () => {
    const stats = computeDiscographyStats(entries, 2026, ['a1', 'a3']);
    assert.equal(stats.concerts, 2);
    assert.equal(stats.distinctArtists, 2);
    assert.equal(stats.liveSongs, 12);
    assert.equal(stats.cities, 2);
    assert.equal(stats.favoritesSeen, 1);
    assert.equal(stats.favoritesTotal, 2);
    assert.equal(stats.busiestMonthKey, '2026-10');
    assert.equal(stats.firstPendingSetlistShowId, 's2');
  });

  it('groups timeline by month', () => {
    const groups = groupDiscographyByMonth(entries, 2026, 'es');
    assert.equal(groups.length, 1);
    assert.equal(groups[0]?.entries.length, 2);
    assert.match(groups[0]?.label ?? '', /2026/);
  });
});
