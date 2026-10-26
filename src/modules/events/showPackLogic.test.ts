import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isShowPackComplete,
  isShowPackExpired,
  showPackExpiresAt,
  SEVEN_DAYS_MS,
} from './showPackLogic';

describe('showPackLogic', () => {
  it('expires seven days after show date', () => {
    const showDate = '2026-11-01T21:00:00.000Z';
    const expected = new Date(showDate).getTime() + SEVEN_DAYS_MS;
    assert.equal(showPackExpiresAt(showDate), expected);
  });

  it('detects expired packs', () => {
    assert.equal(isShowPackExpired({ expiresAt: Date.now() - 1 }), true);
    assert.equal(isShowPackExpired({ expiresAt: Date.now() + 60_000 }), false);
  });

  it('marks ready packs without network failures as complete', () => {
    assert.equal(isShowPackComplete({ status: 'ready', lyricsFailed: 0 }), true);
    assert.equal(isShowPackComplete({ status: 'partial', lyricsFailed: 0 }), false);
    assert.equal(isShowPackComplete({ status: 'ready', lyricsFailed: 2 }), false);
  });
});
