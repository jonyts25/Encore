import assert from 'node:assert/strict';
import test from 'node:test';

import type { Show } from './types';
import {
  activeCutoffIso,
  getShowEnd,
  getShowPhase,
  getTodayGoingShow,
  hasConfirmedTime,
  isShowActive,
  pickPrimaryGoingShow,
} from './visibility';

const cdmxVenue = { timezone: 'America/Mexico_City' } as Show['venue'];

function show(
  partial: Pick<Show, 'show_date'> &
    Partial<Pick<Show, 'local_date' | 'time_confirmed'>> & {
      id?: string;
      venue?: Show['venue'];
    }
): Show {
  return {
    id: partial.id ?? 'show-1',
    artist_id: 'artist-1',
    tour_id: null,
    venue_id: 'venue-1',
    setlistfm_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    artist: {
      id: 'artist-1',
      name: 'Artist',
      image_url: null,
      genres: null,
    },
    venue: partial.venue ?? cdmxVenue,
    local_date: partial.local_date,
    time_confirmed: partial.time_confirmed,
    show_date: partial.show_date,
  };
}

test('Oct 29 21:00 CDMX show is past on Oct 30 18:00; hero is Oct 30 show', () => {
  const elefante = show({
    id: 'elefante',
    show_date: '2026-10-30T03:00:00.000Z',
    local_date: '2026-10-29',
    time_confirmed: true,
  });
  const alejandra = show({
    id: 'alejandra',
    show_date: '2026-10-31T03:00:00.000Z',
    local_date: '2026-10-30',
    time_confirmed: true,
  });
  const now = new Date('2026-10-31T00:00:00.000Z');

  assert.equal(getShowPhase(elefante, now), 'past');
  assert.equal(isShowActive(elefante, now), false);
  assert.equal(getShowPhase(alejandra, now), 'today');

  const hero = pickPrimaryGoingShow([elefante, alejandra], now);
  assert.equal(hero?.id, 'alejandra');
  assert.equal(getTodayGoingShow([elefante, alejandra], now)?.id, 'alejandra');
});

test('12:00 UTC placeholder stays today for the full local calendar day', () => {
  const unconfirmed = show({
    show_date: '2026-06-15T12:00:00.000Z',
    local_date: '2026-06-15',
    time_confirmed: false,
  });
  const lateSameDay = new Date('2026-06-16T04:00:00.000Z');

  assert.equal(hasConfirmedTime(unconfirmed.show_date), false);
  assert.equal(getShowPhase(unconfirmed, lateSameDay), 'today');
  assert.equal(isShowActive(unconfirmed, lateSameDay), true);
});

test('same local day: hero is the show that has not ended yet', () => {
  const afternoon = show({
    id: 'afternoon',
    show_date: '2026-06-15T20:00:00.000Z',
    local_date: '2026-06-15',
    time_confirmed: true,
  });
  const evening = show({
    id: 'evening',
    show_date: '2026-06-16T03:00:00.000Z',
    local_date: '2026-06-15',
    time_confirmed: true,
  });
  const now = new Date('2026-06-16T00:00:00.000Z');

  assert.ok(now.getTime() < getShowEnd(afternoon).getTime());
  assert.ok(now.getTime() < getShowEnd(evening).getTime());

  const hero = pickPrimaryGoingShow([afternoon, evening], now);
  assert.equal(hero?.id, 'evening');
});

test('confirmed show stays today until five hours after start', () => {
  const confirmed = show({
    show_date: '2026-06-16T02:00:00.000Z',
    local_date: '2026-06-15',
    time_confirmed: true,
  });
  const duringShow = new Date('2026-06-16T06:00:00.000Z');
  const afterTail = new Date('2026-06-16T07:01:00.000Z');

  assert.equal(getShowPhase(confirmed, duringShow), 'today');
  assert.equal(isShowActive(confirmed, duringShow), true);
  assert.equal(getShowPhase(confirmed, afterTail), 'past');
});

test('upcoming before midnight of show local date in venue timezone', () => {
  const confirmed = show({
    show_date: '2026-06-16T03:00:00.000Z',
    local_date: '2026-06-15',
    time_confirmed: true,
  });
  const beforeDay = new Date('2026-06-15T05:00:00.000Z');
  const afterDayStart = new Date('2026-06-15T07:00:00.000Z');

  assert.equal(getShowPhase(confirmed, beforeDay), 'upcoming');
  assert.equal(getShowPhase(confirmed, afterDayStart), 'today');
});

test('activeCutoffIso is 30 hours before now', () => {
  const now = new Date('2026-06-16T12:00:00.000Z');
  assert.equal(activeCutoffIso(now), '2026-06-15T06:00:00.000Z');
});

test('pickPrimaryGoingShow falls back to nearest upcoming when no today show', () => {
  const next = show({
    id: 'next',
    show_date: '2026-11-01T03:00:00.000Z',
    local_date: '2026-10-31',
    time_confirmed: true,
  });
  const later = show({
    id: 'later',
    show_date: '2026-11-02T03:00:00.000Z',
    local_date: '2026-11-01',
    time_confirmed: true,
  });
  const now = new Date('2026-10-30T18:00:00.000Z');

  assert.equal(pickPrimaryGoingShow([next, later], now)?.id, 'next');
  assert.equal(getTodayGoingShow([next, later], now), null);
});
