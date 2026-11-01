import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseSetlistFmSetlistIdFromUrl,
  pickBestMatchingSetlist,
  shouldRunSetlistLink,
  showLocalDateToSetlistFmDate,
} from './setlistfm-link-logic';
import type { SetlistFmSetlist } from './providers/setlistfm/types';

function setlist(city: string, lat: number, lng: number): SetlistFmSetlist {
  return {
    id: `setlist-${city}`,
    eventDate: '15-06-2024',
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
  it('parses full https URL', () => {
    const id = parseSetlistFmSetlistIdFromUrl(
      'https://www.setlist.fm/setlist/foo/abc123def456.html'
    );
    assert.equal(id, 'abc123def456');
  });

  it('parses path-only URL', () => {
    const id = parseSetlistFmSetlistIdFromUrl('/setlist/foo/abc123def456.html?foo=1');
    assert.equal(id, 'abc123def456');
  });

  it('accepts raw hex id', () => {
    assert.equal(parseSetlistFmSetlistIdFromUrl('abc123def456'), 'abc123def456');
  });

  it('rejects invalid links', () => {
    assert.equal(parseSetlistFmSetlistIdFromUrl('https://example.com'), null);
    assert.equal(parseSetlistFmSetlistIdFromUrl(''), null);
  });
});

describe('showLocalDateToSetlistFmDate', () => {
  it('formats ISO local date to dd-MM-yyyy', () => {
    assert.equal(showLocalDateToSetlistFmDate('2024-06-15'), '15-06-2024');
  });
});

describe('pickBestMatchingSetlist', () => {
  it('prefers same normalized city when two shows same day', () => {
    const picked = pickBestMatchingSetlist(
      [setlist('Guadalajara', 20.6, -103.3), setlist('Ciudad de México', 19.4, -99.1)],
      { city: 'Mexico City', lat: 19.43, lng: -99.13 }
    );
    assert.equal(picked?.id, 'setlist-Ciudad de México');
  });

  it('falls back to nearest coordinates when city unknown', () => {
    const picked = pickBestMatchingSetlist(
      [setlist('Monterrey', 25.67, -100.31), setlist('Puebla', 19.04, -98.2)],
      { city: null, lat: 19.05, lng: -98.19 }
    );
    assert.equal(picked?.id, 'setlist-Puebla');
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
