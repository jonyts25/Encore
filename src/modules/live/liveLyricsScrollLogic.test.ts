import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { liveLyricsScrollMaxHeight } from './liveLyricsLayout';
import { isTapWithoutScroll, scrollOffsetForActiveLine } from './liveLyricsScrollLogic';

describe('liveLyricsScrollLogic', () => {
  it('computes scroll offset for active line', () => {
    const heights = [40, 50, 30];
    assert.equal(scrollOffsetForActiveLine(0, heights, 46), 0);
    assert.equal(scrollOffsetForActiveLine(2, heights, 46), 40 + 4);
  });

  it('returns bounded scroll heights for each LIVE layout', () => {
    const h = 800;
    assert.ok(liveLyricsScrollMaxHeight('strip', h) >= 160);
    assert.ok(liveLyricsScrollMaxHeight('split', h) > liveLyricsScrollMaxHeight('floating', h));
    assert.ok(liveLyricsScrollMaxHeight('overlay', h) >= 180);
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
