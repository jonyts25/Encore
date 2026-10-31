import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterVenueIdsEligibleForGeocode,
  shouldRecordVenueGeocodeAttempt,
  uniqueUnlocatedVenueIds,
  VENUE_GEOCODE_RETRY_MS,
} from './myMapVenueGeocodeLogic';
import type { Show } from './types';

function show(venueId: string, lat: number | null): Show {
  return {
    id: `s-${venueId}`,
    artist_id: 'a1',
    tour_id: null,
    venue_id: venueId,
    show_date: '2024-01-01T03:00:00.000Z',
    local_date: '2024-01-01',
    time_confirmed: true,
    setlistfm_id: null,
    created_at: '2024-01-01T03:00:00.000Z',
    artist: { id: 'a1', name: 'A', image_url: null, genres: null },
    venue: {
      id: venueId,
      name: 'V',
      city: 'C',
      country: 'MX',
      lat,
      lng: lat == null ? null : -99,
      capacity: null,
    },
  };
}

test('uniqueUnlocatedVenueIds dedupes venues missing coordinates', () => {
  const ids = uniqueUnlocatedVenueIds([
    show('v1', null),
    show('v1', null),
    show('v2', 19),
  ]);
  assert.deepEqual(ids.sort(), ['v1']);
});

test('shouldRecordVenueGeocodeAttempt skips error responses', () => {
  assert.equal(shouldRecordVenueGeocodeAttempt('updated'), true);
  assert.equal(shouldRecordVenueGeocodeAttempt('not_found'), true);
  assert.equal(shouldRecordVenueGeocodeAttempt('skipped'), true);
  assert.equal(shouldRecordVenueGeocodeAttempt('error'), false);
});

test('filterVenueIdsEligibleForGeocode respects 24h cooldown', () => {
  const now = Date.now();
  const map = new Map<string, number>([['v1', now - VENUE_GEOCODE_RETRY_MS + 1000]]);
  const eligible = filterVenueIdsEligibleForGeocode(['v1', 'v2'], map, now);
  assert.deepEqual(eligible, ['v2']);
});
