import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectCurrentTourName,
  ENRICH_COOLDOWN_MS,
  shouldAssignTourToShow,
  shouldRunEnrich,
  type SetlistTourCandidate,
} from './enrich-show-logic';

function candidate(eventDate: string, tourName: string | null): SetlistTourCandidate {
  return { setlistId: `${eventDate}-${tourName ?? 'none'}`, eventDate, tourName, hasSongs: true };
}

test('detectCurrentTourName picks tour from the newest setlist that has tour.name', () => {
  const list: SetlistTourCandidate[] = [
    candidate('15-06-2024', 'Tour Alpha'),
    candidate('20-08-2025', 'Tour Beta'),
    candidate('01-01-2025', 'Tour Alpha'),
  ];
  assert.equal(detectCurrentTourName(list), 'Tour Beta');
});

test('shouldAssignTourToShow skips when show already has tour_id', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const candidates = [candidate('01-05-2026', 'Fresh Tour')];
  assert.equal(
    shouldAssignTourToShow({
      existingTourId: 'existing-tour',
      currentTourName: 'Fresh Tour',
      candidates,
      now,
    }),
    false
  );
});

test('shouldRunEnrich respects 12h cooldown', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const recent = new Date(now.getTime() - ENRICH_COOLDOWN_MS + 60_000).toISOString();
  const stale = new Date(now.getTime() - ENRICH_COOLDOWN_MS - 60_000).toISOString();

  assert.equal(shouldRunEnrich(null, now), true);
  assert.equal(shouldRunEnrich(recent, now), false);
  assert.equal(shouldRunEnrich(stale, now), true);
});
