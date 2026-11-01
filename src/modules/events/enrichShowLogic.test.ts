import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldRequestPastShowSetlistLink,
  shouldRequestSetlistLinkOnConfirm,
} from './enrichShowLogic';

describe('shouldRequestPastShowSetlistLink', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');

  it('requests link for past shows without songs when never checked', () => {
    assert.equal(
      shouldRequestPastShowSetlistLink({
        isPastShow: true,
        showSongCount: 0,
        setlistCheckedAt: null,
        now,
      }),
      true
    );
  });

  it('skips when songs already ingested', () => {
    assert.equal(
      shouldRequestPastShowSetlistLink({
        isPastShow: true,
        showSongCount: 12,
        setlistCheckedAt: null,
        now,
      }),
      false
    );
  });
});

describe('shouldRequestSetlistLinkOnConfirm', () => {
  it('allows refresh after 12h', () => {
    const now = new Date('2026-06-01T12:00:00.000Z');
    const recent = new Date('2026-06-01T08:00:00.000Z').toISOString();
    assert.equal(shouldRequestSetlistLinkOnConfirm({ setlistCheckedAt: recent, now }), false);
    assert.equal(shouldRequestSetlistLinkOnConfirm({ setlistCheckedAt: null, now }), true);
  });
});
