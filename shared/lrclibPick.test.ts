import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickBestLrclibRecord, readLrclibDuration } from './lrclibPick';

describe('pickBestLrclibRecord', () => {
  it('returns null when no plain lyrics', () => {
    assert.equal(pickBestLrclibRecord([{ id: 1, plainLyrics: '  ' }]), null);
  });

  it('prefers synced over duration-only', () => {
    const best = pickBestLrclibRecord([
      { id: 1, plainLyrics: 'a', duration: 200 },
      { id: 2, plainLyrics: 'b', syncedLyrics: '[00:01.00] hi' },
    ]);
    assert.equal(best?.id, 2);
  });

  it('prefers duration when no synced', () => {
    const best = pickBestLrclibRecord([
      { id: 1, plainLyrics: 'a' },
      { id: 2, plainLyrics: 'b', duration: 180 },
    ]);
    assert.equal(best?.id, 2);
  });

  it('falls back to first with plain lyrics', () => {
    const best = pickBestLrclibRecord([
      { id: 9, plainLyrics: 'first' },
      { id: 10, plainLyrics: 'second' },
    ]);
    assert.equal(best?.id, 9);
  });

  it('readLrclibDuration ignores non-positive values', () => {
    assert.equal(readLrclibDuration({ id: 1, duration: 0 }), null);
    assert.equal(readLrclibDuration({ id: 1, duration: 120 }), 120);
  });
});
