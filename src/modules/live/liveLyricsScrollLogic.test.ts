import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activeLineIndexAfterContinueFrom,
  continueFromLineElapsedSeconds,
} from './liveLyricsContinueFromLine';
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

  it('synced continue-from uses LRC timestamp as elapsed offset', () => {
    const display = ['intro', 'chorus', 'outro'];
    const synced = [
      { line: 'intro', timestamp_seconds: 0 },
      { line: 'chorus', timestamp_seconds: 42.5 },
      { line: 'outro', timestamp_seconds: 90 },
    ];
    assert.equal(
      continueFromLineElapsedSeconds(1, 'synced', display, synced, 120),
      42.5
    );
    assert.equal(activeLineIndexAfterContinueFrom(1, 'synced', display, synced, 120), 1);
  });

  it('manual continue-from marks line without LRC timestamps', () => {
    const display = ['a', 'b', 'c'];
    assert.equal(continueFromLineElapsedSeconds(2, 'manual', display, [], null), 8);
    assert.equal(activeLineIndexAfterContinueFrom(2, 'manual', display, [], null), 2);
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
