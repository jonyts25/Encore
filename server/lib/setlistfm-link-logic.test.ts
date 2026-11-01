import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterSetlistsByExactEventDate,
  parseSetlistFmSetlistIdFromUrl,
  pickBestMatchingSetlist,
  shouldRunSetlistLink,
  showLocalDateToSetlistFmDate,
  venueMatchesForSetlistLink,
} from './setlistfm-link-logic';
import type { SetlistFmSetlist } from './providers/setlistfm/types';

function setlist(city: string, eventDate: string, lat: number, lng: number): SetlistFmSetlist {
  return {
    id: `setlist-${city}-${eventDate}`,
    eventDate,
    artist: { mbid: 'artist-mbid', name: 'Artist' },
    venue: {
      name: 'Arena',
      city: {
        name: city,
        coords: { lat, long: lng },
        country: { code: 'MX', name: 'Mexico' },
      },
    },
  };
}

describe('parseSetlistFmSetlistIdFromUrl', () => {
  it('parses Mana León URL id', () => {
    const id = parseSetlistFmSetlistIdFromUrl(
      'https://www.setlist.fm/setlist/mana/2024/explanada-de-la-feria-leon-mexico-5354c34d.html'
    );
    assert.equal(id, '5354c34d');
  });

  it('parses short legacy path URLs', () => {
    const id = parseSetlistFmSetlistIdFromUrl(
      'https://www.setlist.fm/setlist/foo/abc123def456.html'
    );
    assert.equal(id, 'abc123def456');
  });

  it('rejects invalid links', () => {
    assert.equal(parseSetlistFmSetlistIdFromUrl('https://example.com'), null);
  });
});

describe('filterSetlistsByExactEventDate', () => {
  it('drops setlists from wrong day when artist feed ignores date', () => {
    const filtered = filterSetlistsByExactEventDate(
      [
        setlist('Detroit', '01-11-2026', 42.33, -83.05),
        setlist('León', '26-10-2024', 21.12, -101.68),
      ],
      '26-10-2024'
    );
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.venue.city.name, 'León');
  });
});

describe('pickBestMatchingSetlist', () => {
  const requested = '26-10-2024';
  const leonHint = { city: 'León', lat: 21.12, lng: -101.68 };

  it('returns null when only wrong-day setlists are present', () => {
    const picked = pickBestMatchingSetlist(
      [setlist('Detroit', '01-11-2026', 42.33, -83.05)],
      requested,
      leonHint
    );
    assert.equal(picked, null);
  });

  it('returns null when date matches but city is far away', () => {
    const picked = pickBestMatchingSetlist(
      [setlist('Detroit', '26-10-2024', 42.33, -83.05)],
      requested,
      leonHint
    );
    assert.equal(picked, null);
  });

  it('links when date and city match', () => {
    const picked = pickBestMatchingSetlist(
      [
        setlist('Detroit', '01-11-2026', 42.33, -83.05),
        setlist('León', '26-10-2024', 21.12, -101.68),
      ],
      requested,
      leonHint
    );
    assert.equal(picked?.venue.city.name, 'León');
    assert.equal(picked?.eventDate, '26-10-2024');
  });
});

describe('venueMatchesForSetlistLink', () => {
  it('accepts within 50 km by coordinates', () => {
    const item = setlist('León', '26-10-2024', 21.12, -101.68);
    assert.equal(
      venueMatchesForSetlistLink(item, { city: null, lat: 21.15, lng: -101.7 }),
      true
    );
  });
});

describe('showLocalDateToSetlistFmDate', () => {
  it('formats ISO local date to dd-MM-yyyy', () => {
    assert.equal(showLocalDateToSetlistFmDate('2024-10-26'), '26-10-2024');
  });
});

describe('shouldRunSetlistLink', () => {
  it('respects 12h cooldown', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    const recent = new Date('2026-06-01T06:00:00.000Z').toISOString();
    assert.equal(shouldRunSetlistLink(recent, now), false);
    assert.equal(shouldRunSetlistLink(null, now), true);
  });
});
