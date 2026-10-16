import assert from 'node:assert/strict';
import test from 'node:test';

import {
  activeCutoffIso,
  getShowPhase,
  hasConfirmedTime,
  isShowActiveInHomeWindow,
} from './visibility';

test('show at 20:00 stays active at 23:00 same day and 01:00 next day', () => {
  const showDate = '2026-06-15T20:00:00.000Z';

  assert.equal(getShowPhase(showDate, new Date('2026-06-15T23:00:00.000Z')), 'today');
  assert.equal(getShowPhase(showDate, new Date('2026-06-16T01:00:00.000Z')), 'today');
  assert.equal(isShowActiveInHomeWindow(showDate, new Date('2026-06-15T23:00:00.000Z')), true);
  assert.equal(isShowActiveInHomeWindow(showDate, new Date('2026-06-16T01:00:00.000Z')), true);
});

test('show at 20:00 is hidden after 31 hours', () => {
  const showDate = '2026-06-15T20:00:00.000Z';
  const now = new Date('2026-06-17T03:00:00.000Z');

  assert.equal(getShowPhase(showDate, now), 'past');
  assert.equal(isShowActiveInHomeWindow(showDate, now), false);
});

test('show at 12:00 UTC without confirmed time is visible all concert night', () => {
  const showDate = '2026-06-15T12:00:00.000Z';

  assert.equal(hasConfirmedTime(showDate), false);
  assert.equal(getShowPhase(showDate, new Date('2026-06-15T23:30:00.000Z')), 'today');
  assert.equal(isShowActiveInHomeWindow(showDate, new Date('2026-06-15T23:30:00.000Z')), true);
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
