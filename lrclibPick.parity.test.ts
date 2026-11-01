import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as sharedPick from './shared/lrclibPick';
import * as serverPick from './server/lib/shared-copies/lrclibPick';

import * as sharedParse from './shared/parseLrc';
import * as serverParse from './server/lib/shared-copies/parseLrc';

const FIXTURES: sharedPick.LrclibPickRecord[][] = [
  [],
  [{ id: 1, plainLyrics: '' }],
  [
    { id: 1, plainLyrics: 'a', duration: 300 },
    { id: 2, plainLyrics: 'b', syncedLyrics: '[00:00.50] x' },
  ],
  [
    { id: 10, plainLyrics: 'first' },
    { id: 11, plainLyrics: 'second', duration: 1 },
  ],
];

describe('lrclibPick parity (shared vs server/lib/shared-copies)', () => {
  for (const [index, fixture] of FIXTURES.entries()) {
    it(`pick fixture ${index} matches`, () => {
      assert.deepEqual(
        sharedPick.pickBestLrclibRecord(fixture),
        serverPick.pickBestLrclibRecord(fixture)
      );
    });
  }

  it('readLrclibDuration matches', () => {
    const record = { id: 1, duration: 240 };
    assert.equal(sharedPick.readLrclibDuration(record), serverPick.readLrclibDuration(record));
  });
});

describe('parseLrc parity (shared vs server/lib/shared-copies)', () => {
  it('parses the same LRC sample', () => {
    const sample = '[00:01.00] Hello\n[00:02.50] World';
    assert.deepEqual(sharedParse.parseLrc(sample), serverParse.parseLrc(sample));
  });
});
