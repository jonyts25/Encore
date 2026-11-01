import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { medleyPartTitles, splitMedleyParts } from './medleyParts';

describe('medleyParts', () => {
  it('splits titles on " / "', () => {
    assert.deepEqual(splitMedleyParts('Intro / Hit / Outro'), ['Intro', 'Hit', 'Outro']);
  });

  it('returns a single title when not a medley', () => {
    assert.deepEqual(medleyPartTitles('Single Song'), ['Single Song']);
  });

  it('honors explicit is_medley flag', () => {
    assert.deepEqual(medleyPartTitles('A / B', false), ['A / B']);
    assert.deepEqual(medleyPartTitles('A + B', true), ['A + B']);
  });
});
