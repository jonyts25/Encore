import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseSetlistFmEventDate, parseSetlistFmLocalDate } from './adapter';
import { resolveSetlistFmVenueTimezone } from './venue-timezone';

describe('parseSetlistFmLocalDate', () => {
  it('returns calendar date from dd-MM-yyyy without UTC shift', () => {
    assert.equal(parseSetlistFmLocalDate('31-10-2026'), '2026-10-31');
    assert.equal(parseSetlistFmLocalDate('01-01-2025'), '2025-01-01');
  });

  it('parseSetlistFmEventDate still uses noon UTC placeholder', () => {
    assert.equal(parseSetlistFmEventDate('31-10-2026'), '2026-10-31T12:00:00.000Z');
  });
});

describe('resolveSetlistFmVenueTimezone', () => {
  it('maps Mexico cities', () => {
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'Tijuana', countryName: 'Mexico', countryCode: 'MX' }),
      'America/Tijuana'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'Monterrey', countryName: 'Mexico', countryCode: 'MX' }),
      'America/Mexico_City'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'Guadalajara', countryName: 'Mexico', countryCode: 'MX' }),
      'America/Mexico_City'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Ciudad de México',
        countryName: 'Mexico',
        countryCode: 'MX',
      }),
      'America/Mexico_City'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'Cancún', countryName: 'Mexico', countryCode: 'MX' }),
      'America/Cancun'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'Mérida', countryName: 'Mexico', countryCode: 'MX' }),
      null
    );
  });

  it('maps US states', () => {
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Los Angeles',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'CA',
      }),
      'America/Los_Angeles'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Austin',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'TX',
      }),
      'America/Chicago'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'New York',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'NY',
      }),
      'America/New_York'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Phoenix',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'AZ',
      }),
      'America/Phoenix'
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Denver',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'CO',
      }),
      'America/Denver'
    );
  });

  it('returns null when unknown', () => {
    assert.equal(
      resolveSetlistFmVenueTimezone({ city: 'London', countryName: 'United Kingdom', countryCode: 'GB' }),
      null
    );
    assert.equal(
      resolveSetlistFmVenueTimezone({
        city: 'Somewhere',
        countryName: 'United States',
        countryCode: 'US',
        stateCode: 'WY',
      }),
      null
    );
  });
});

describe('setlist.fm time_confirmed convention', () => {
  it('noon UTC placeholder is not a confirmed show time', () => {
    const showDate = parseSetlistFmEventDate('15-06-2026');
    const date = new Date(showDate);
    const isNoonUtc =
      date.getUTCHours() === 12 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
    assert.equal(isNoonUtc, true);
    assert.equal(parseSetlistFmLocalDate('15-06-2026'), '2026-06-15');
  });
});
