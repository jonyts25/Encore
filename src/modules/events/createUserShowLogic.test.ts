import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isDuplicateShowKey,
  parseCreateUserShowResponse,
  parseLocalDateInput,
  parseLocalTimeInput,
  showDedupeKey,
} from './createUserShowLogic';

describe('createUserShowLogic', () => {
  it('builds stable dedupe keys', () => {
    const key = showDedupeKey('a1', 'v1', '2026-11-01');
    assert.equal(key, 'a1:v1:2026-11-01');
    assert.equal(
      isDuplicateShowKey('a1', 'v1', '2026-11-01', {
        artistId: 'a1',
        venueId: 'v1',
        localDate: '2026-11-01',
      }),
      true
    );
    assert.equal(
      isDuplicateShowKey('a1', 'v1', '2026-11-02', {
        artistId: 'a1',
        venueId: 'v1',
        localDate: '2026-11-01',
      }),
      false
    );
  });

  it('parses local date input', () => {
    assert.deepEqual(parseLocalDateInput('2026-12-31'), { ok: true, value: '2026-12-31' });
    assert.deepEqual(parseLocalDateInput('2026-02-30'), { ok: false });
    assert.deepEqual(parseLocalDateInput('bad'), { ok: false });
  });

  it('parses local time input', () => {
    assert.deepEqual(parseLocalTimeInput('21:30'), {
      ok: true,
      value: '21:30:00',
      confirmed: true,
    });
    assert.deepEqual(parseLocalTimeInput(''), {
      ok: true,
      value: '20:00:00',
      confirmed: false,
    });
    assert.deepEqual(parseLocalTimeInput('99:00'), { ok: false });
  });

  it('parses RPC responses', () => {
    assert.deepEqual(parseCreateUserShowResponse({ result: 'created', show_id: 's1' }), {
      kind: 'created',
      showId: 's1',
    });
    assert.deepEqual(parseCreateUserShowResponse({ result: 'existing', show_id: 's2' }), {
      kind: 'existing',
      showId: 's2',
    });
    assert.deepEqual(
      parseCreateUserShowResponse({
        result: 'venue_candidates',
        candidates: [{ id: 'v1', name: 'Palacio', city: 'CDMX', country: 'MX' }],
      }),
      {
        kind: 'venue_candidates',
        candidates: [{ id: 'v1', name: 'Palacio', city: 'CDMX', country: 'MX' }],
      }
    );
    assert.deepEqual(
      parseCreateUserShowResponse({ result: 'daily_limit', created_today: 5, limit: 5 }),
      { kind: 'daily_limit', createdToday: 5, limit: 5 }
    );
  });
});
