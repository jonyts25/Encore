import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activeCutoffIso,
  getShowPhase,
  hasConfirmedTime,
  isShowActive,
} from './visibility';

test('show at 21:00 local stays visible at 1:00 am next day (Mexico)', () => {
  // 21:00 America/Mexico_City (CDT, UTC-5) on 2026-06-15
  const showDate = '2026-06-16T02:00:00.000Z';
  // 01:00 on 2026-06-16 in Mexico City
  const now = new Date('2026-06-16T06:00:00.000Z');

  assert.equal(isShowActive(showDate, now), true);
  assert.equal(getShowPhase(showDate, now), 'today');
});

test('show at 12:00 UTC stays visible at 23:00 Mexico same calendar day', () => {
  const showDate = '2026-06-15T12:00:00.000Z';
  // 23:00 on 2026-06-15 in Mexico City (CDT)
  const now = new Date('2026-06-16T04:00:00.000Z');

  assert.equal(hasConfirmedTime(showDate), false);
  assert.equal(isShowActive(showDate, now), true);
  assert.equal(getShowPhase(showDate, now), 'today');
});

test('show from 2 days ago is not active', () => {
  const showDate = '2026-06-13T20:00:00.000Z';
  const now = new Date('2026-06-16T12:00:00.000Z');

  assert.equal(isShowActive(showDate, now), false);
  assert.equal(getShowPhase(showDate, now), 'past');
});

test('show at 20:00 stays active at 23:00 same day and 01:00 next day', () => {
  const showDate = '2026-06-15T20:00:00.000Z';

  assert.equal(getShowPhase(showDate, new Date('2026-06-15T23:00:00.000Z')), 'today');
  assert.equal(getShowPhase(showDate, new Date('2026-06-16T01:00:00.000Z')), 'today');
  assert.equal(isShowActive(showDate, new Date('2026-06-15T23:00:00.000Z')), true);
  assert.equal(isShowActive(showDate, new Date('2026-06-16T01:00:00.000Z')), true);
});

test('show at 20:00 is hidden after 31 hours', () => {
  const showDate = '2026-06-15T20:00:00.000Z';
  const now = new Date('2026-06-17T03:00:00.000Z');

  assert.equal(getShowPhase(showDate, now), 'past');
  assert.equal(isShowActive(showDate, now), false);
});

test('activeCutoffIso is 30 hours before now', () => {
  const now = new Date('2026-06-16T12:00:00.000Z');
  assert.equal(activeCutoffIso(now), '2026-06-15T06:00:00.000Z');
});

test('phases around lead and tail windows', () => {
  const showDate = '2026-06-15T20:00:00.000Z';

  assert.equal(getShowPhase(showDate, new Date('2026-06-15T07:00:00.000Z')), 'upcoming');
  assert.equal(getShowPhase(showDate, new Date('2026-06-15T08:00:00.000Z')), 'today');
  assert.equal(getShowPhase(showDate, new Date('2026-06-17T01:59:00.000Z')), 'today');
  assert.equal(getShowPhase(showDate, new Date('2026-06-17T02:01:00.000Z')), 'past');
});
