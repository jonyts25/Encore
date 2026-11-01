import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickBestLrclibRecord as sharedPick } from './shared/lrclibPick';

type Record = Parameters<typeof sharedPick>[0][number];

/** Previous in-server ranking (kept here for regression parity). */
function legacyServerPick(records: Record[]): Record | null {
  const withLyrics = records.filter((record) => Boolean(record.plainLyrics?.trim()));
  if (withLyrics.length === 0) return null;

  const readDuration = (record: Record) =>
    typeof record.duration === 'number' && record.duration > 0 ? record.duration : null;

  return (
    withLyrics.find((record) => Boolean(record.syncedLyrics?.trim())) ??
    withLyrics.find((record) => readDuration(record) !== null) ??
    withLyrics[0]
  );
}

const FIXTURES: Record[][] = [
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

describe('lrclibPick parity (shared vs legacy server)', () => {
  for (const [index, fixture] of FIXTURES.entries()) {
    it(`fixture ${index} matches legacy server pick`, () => {
      assert.deepEqual(sharedPick(fixture), legacyServerPick(fixture));
    });
  }
});
