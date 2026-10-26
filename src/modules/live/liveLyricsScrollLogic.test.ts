import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTapWithoutScroll, scrollOffsetForActiveLine } from './liveLyricsScrollLogic';

describe('liveLyricsScrollLogic', () => {
  it('computes scroll offset for active line', () => {
    const heights = [40, 50, 30];
    assert.equal(scrollOffsetForActiveLine(0, heights, 46), 0);
    assert.equal(scrollOffsetForActiveLine(2, heights, 46), 40 + 4);
  });

  it('detects tap vs scroll', () => {
    assert.equal(
      isTapWithoutScroll({
        startX: 10,
        startY: 10,
        endX: 11,
        endY: 12,
        startTimeMs: 100,
        endTimeMs: 200,
        didScroll: false,
      }),
      true
    );
    assert.equal(
      isTapWithoutScroll({
        startX: 10,
        startY: 10,
        endX: 11,
        endY: 12,
        startTimeMs: 100,
        endTimeMs: 200,
        didScroll: true,
      }),
      false
    );
  });
});
