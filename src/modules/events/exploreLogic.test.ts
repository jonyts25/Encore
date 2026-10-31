import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildArtistShowSections } from './artistShowSectionsLogic';
import { formatVenueNearbySubtitle } from './venueSearchFormat';
import {
  collectExploreCities,
  exploreHasCityContent,
  filterShowsByCity,
  pickDefaultExploreCity,
  showsThisWeekInCity,
  upcomingShowsInCitySorted,
} from './exploreLogic';
import type { Show } from './types';

function show(partial: Partial<Show> & Pick<Show, 'id' | 'show_date' | 'venue'>): Show {
  return {
    artist_id: 'artist-1',
    tour_id: null,
    setlistfm_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    artist: {
      id: 'artist-1',
      name: 'Artist',
      image_url: null,
      genres: null,
    },
    ...partial,
  } as Show;
}

describe('exploreLogic', () => {
  it('picks user city when available', () => {
    const cities = collectExploreCities([
      show({
        id: '1',
        show_date: '2026-11-01T03:00:00.000Z',
        venue: { id: 'v1', name: 'Arena', city: 'Monterrey', country: 'MX' } as never,
      }),
      show({
        id: '2',
        show_date: '2026-11-02T03:00:00.000Z',
        venue: { id: 'v2', name: 'Palacio', city: 'Guadalajara', country: 'MX' } as never,
      }),
    ]);
    assert.deepEqual(cities.sort(), ['Guadalajara', 'Monterrey']);
    assert.equal(
      pickDefaultExploreCity({ cities, userShowCities: ['Guadalajara'] }),
      'Guadalajara'
    );
  });

  it('filters this week shows in city', () => {
    const now = new Date('2026-10-27T12:00:00.000Z');
    const shows = [
      show({
        id: '1',
        show_date: '2026-10-29T03:00:00.000Z',
        venue: { id: 'v1', name: 'Arena', city: 'Guadalajara', country: 'MX' } as never,
      }),
      show({
        id: '2',
        show_date: '2026-11-10T03:00:00.000Z',
        venue: { id: 'v2', name: 'Arena', city: 'Guadalajara', country: 'MX' } as never,
      }),
    ];
    const week = showsThisWeekInCity(shows, 'Guadalajara', now);
    assert.equal(week.length, 1);
    assert.equal(week[0]?.id, '1');
  });

  it('hides empty explore city content', () => {
    assert.equal(
      exploreHasCityContent({
        weekShows: [],
        upcoming: [],
        seenArtists: [],
        popularArtists: [],
        venues: [],
      }),
      false
    );
    assert.equal(
      exploreHasCityContent({
        weekShows: [],
        upcoming: [show({ id: '1', show_date: '2026-11-01T03:00:00.000Z', venue: { id: 'v', name: 'A', city: 'X', country: 'MX' } as never })],
        seenArtists: [],
        popularArtists: [],
        venues: [],
      }),
      true
    );
  });

  it('filters by city case-insensitively', () => {
    const shows = [
      show({
        id: '1',
        show_date: '2026-11-01T03:00:00.000Z',
        venue: { id: 'v1', name: 'Arena', city: 'Guadalajara', country: 'MX' } as never,
      }),
    ];
    assert.equal(filterShowsByCity(shows, 'guadalajara').length, 1);
  });

  it('drops past shows from city upcoming even inside activeCutoff window', () => {
    const now = new Date('2026-10-31T18:00:00.000Z');
    const venue = { id: 'v1', name: 'Arena', city: 'Guadalajara', country: 'MX', timezone: 'America/Mexico_City' } as never;
    const shows = [
      show({
        id: 'past',
        show_date: '2026-10-30T21:00:00.000Z',
        venue,
      }),
      show({
        id: 'future',
        show_date: '2026-11-15T21:00:00.000Z',
        venue,
      }),
    ];
    const upcoming = upcomingShowsInCitySorted(shows, 'Guadalajara', 10);
    assert.deepEqual(
      upcoming.map((row) => row.id),
      ['future']
    );
    assert.equal(showsThisWeekInCity(shows, 'Guadalajara', now).length, 0);
  });
});

describe('formatVenueNearbySubtitle', () => {
  it('formats city and rounded distance', () => {
    const label = formatVenueNearbySubtitle(
      { city: 'Zapopan', country: 'MX', distance_km: 8.2 },
      (_key, params) => `${params?.city} · ${params?.distance} km`
    );
    assert.equal(label, 'Zapopan · 8 km');
  });
});

describe('buildArtistShowSections', () => {
  it('keeps a last-night fui show only in attended, not in other or yours', () => {
    const now = new Date('2026-10-31T18:00:00.000Z');
    const venue = {
      id: 'venue-1',
      name: 'Arena',
      city: 'CDMX',
      country: 'MX',
      lat: null,
      lng: null,
      capacity: null,
      timezone: 'America/Mexico_City',
    } as never;
    const lastNight = show({
      id: 'show-last-night',
      show_date: '2026-10-30T21:00:00.000Z',
      venue,
    });
    const future = show({
      id: 'show-future',
      show_date: '2026-11-15T21:00:00.000Z',
      venue,
    });

    const sections = buildArtistShowSections({
      upcomingForArtist: [lastNight, future],
      userShowRows: [{ show_id: lastNight.id, status: 'fui' }],
      attendedShows: [lastNight],
      artistId: 'artist-1',
      now,
    });

    assert.deepEqual(
      sections.yours.map((row) => row.id),
      []
    );
    assert.deepEqual(
      sections.other.map((row) => row.id),
      [future.id]
    );
    assert.deepEqual(
      sections.attended.map((row) => row.id),
      [lastNight.id]
    );
  });
});
