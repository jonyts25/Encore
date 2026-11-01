import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildShowOrdersForKeys,
  copelandScore,
  isEncoreMajority,
  medianNormalizedPosition,
  orderKeysByMajority,
  orderSetlistEntriesByMajority,
  songBeatsInMajority,
} from './setlist-prediction-order';
import type { SongAggregate } from './setlist-prediction-types';

function entry(
  key: string,
  appearances: Array<{ showId: string; position: number; isEncore?: boolean }>
): SongAggregate & { avgPosition: number; latestShowDate: string } {
  return {
    normalizedKey: key,
    titleCounts: new Map([[key, 1]]),
    songIdCounts: new Map([[key, 1]]),
    appearances: appearances.map((row) => ({
      showId: row.showId,
      showDate: '2026-01-01',
      position: row.position,
      isEncore: row.isEncore ?? false,
    })),
    avgPosition: 0,
    latestShowDate: '2026-01-01',
  };
}

describe('setlist-prediction-order', () => {
  it('majority pairwise order ignores a one-off show with extra openers', () => {
    const showOrders = [
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['x', 'y', 'a', 'b', 'c'],
    ];

    assert.equal(songBeatsInMajority('a', 'b', showOrders), true);
    assert.equal(songBeatsInMajority('b', 'c', showOrders), true);
    const ordered = orderKeysByMajority(['a', 'b', 'c'], showOrders, new Map());
    assert.deepEqual(ordered, ['a', 'b', 'c']);
    assert.ok(copelandScore('a', ['a', 'b', 'c'], showOrders) >= copelandScore('b', ['a', 'b', 'c'], showOrders));
  });

  it('places encore-majority songs after the main set', () => {
    const entries = [
      entry('main', [{ showId: 's1', position: 1 }, { showId: 's2', position: 1 }]),
      entry('enc', [
        { showId: 's1', position: 2, isEncore: true },
        { showId: 's2', position: 2, isEncore: true },
      ]),
    ];
    assert.equal(isEncoreMajority(entries[1]!), true);

    const songsByShow = new Map([
      ['s1', [{ position: 1, song: { title: 'main' } }, { position: 2, song: { title: 'enc' } }]],
      ['s2', [{ position: 1, song: { title: 'main' } }, { position: 2, song: { title: 'enc' } }]],
    ]);
    const showLengths = new Map([
      ['s1', 2],
      ['s2', 2],
    ]);

    const ordered = orderSetlistEntriesByMajority(
      entries,
      ['s1', 's2'],
      songsByShow,
      showLengths,
      (title) => title,
      () => false
    );

    assert.deepEqual(
      ordered.map((row) => row.normalizedKey),
      ['main', 'enc']
    );
  });

  it('breaks Copeland ties with median normalized position', () => {
    const showOrders = buildShowOrdersForKeys(
      ['s1', 's2'],
      new Map([
        ['s1', [{ position: 1, song: { title: 'early' } }, { position: 2, song: { title: 'late' } }]],
        ['s2', [{ position: 1, song: { title: 'late' } }, { position: 2, song: { title: 'early' } }]],
      ]),
      new Set(['early', 'late']),
      (title) => title,
      () => false
    );

    assert.equal(songBeatsInMajority('early', 'late', showOrders), false);
    assert.equal(songBeatsInMajority('late', 'early', showOrders), false);

    const early = entry('early', [
      { showId: 's1', position: 1 },
      { showId: 's2', position: 1 },
    ]);
    const late = entry('late', [
      { showId: 's1', position: 2 },
      { showId: 's2', position: 1 },
    ]);
    const showLengths = new Map([
      ['s1', 10],
      ['s2', 10],
    ]);
    const medianByKey = new Map([
      ['early', medianNormalizedPosition(early, showLengths)],
      ['late', medianNormalizedPosition(late, showLengths)],
    ]);

    assert.ok(medianByKey.get('early')! < medianByKey.get('late')!);
    const ordered = orderKeysByMajority(['early', 'late'], showOrders, medianByKey);
    assert.deepEqual(ordered, ['early', 'late']);
  });
});
