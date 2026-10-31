import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyMapData,
  filterAttendedShowsByYear,
  groupAttendedShowsByVenue,
  pinArtistForGroup,
  showCalendarYear,
} from './myMapLogic';
import type { Show } from './types';

function baseVenue(id: string, lat: number | null, lng: number | null) {
  return {
    id,
    name: `Venue ${id}`,
    city: id === 'v3' ? 'Monterrey' : 'CDMX',
    country: 'MX',
    lat,
    lng,
    capacity: null,
  };
}

function makeShow(input: {
  id: string;
  venueId: string;
  showDate: string;
  localDate?: string;
  artistName?: string;
  lat?: number | null;
  lng?: number | null;
}): Show {
  return {
    id: input.id,
    artist_id: 'a1',
    tour_id: null,
    venue_id: input.venueId,
    show_date: input.showDate,
    local_date: input.localDate ?? input.showDate.slice(0, 10),
    time_confirmed: true,
    setlistfm_id: null,
    created_at: input.showDate,
    artist: {
      id: 'a1',
      name: input.artistName ?? 'Artist',
      image_url: null,
      genres: null,
    },
    venue: baseVenue(
      input.venueId,
      input.lat !== undefined ? input.lat : 19.4,
      input.lng !== undefined ? input.lng : -99.1
    ),
  };
}

test('showCalendarYear prefers local_date', () => {
  const s = makeShow({
    id: '1',
    venueId: 'v1',
    showDate: '2025-06-01T03:00:00.000Z',
    localDate: '2024-12-31',
  });
  assert.equal(showCalendarYear(s), 2024);
});

test('groupAttendedShowsByVenue splits unlocated and picks latest show for pin', () => {
  const grouped = groupAttendedShowsByVenue([
    makeShow({
      id: '1',
      venueId: 'v1',
      showDate: '2024-01-01T03:00:00.000Z',
      artistName: 'Older',
    }),
    makeShow({
      id: '2',
      venueId: 'v1',
      showDate: '2025-01-01T03:00:00.000Z',
      artistName: 'Newer',
    }),
    makeShow({
      id: '3',
      venueId: 'v2',
      showDate: '2025-02-01T03:00:00.000Z',
      lat: null,
      lng: null,
    }),
  ]);

  assert.equal(grouped.locatedGroups.length, 1);
  assert.equal(grouped.unlocatedShows.length, 1);
  const pin = pinArtistForGroup(grouped.locatedGroups[0]!);
  assert.equal(pin.name, 'Newer');
  assert.equal(pin.extraCount, 1);
});

test('filterAttendedShowsByYear and buildMyMapData stats', () => {
  const all = [
    makeShow({ id: '1', venueId: 'v1', showDate: '2023-05-01T03:00:00.000Z' }),
    makeShow({ id: '2', venueId: 'v3', showDate: '2024-08-01T03:00:00.000Z' }),
  ];
  const filtered = filterAttendedShowsByYear(all, 2024);
  assert.equal(filtered.length, 1);
  const data = buildMyMapData(all);
  assert.equal(data.stats.concerts, 2);
  assert.equal(data.stats.cities, 2);
  assert.equal(data.years.includes(2024), true);
});
