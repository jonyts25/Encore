import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldSuppressTapAfterLongPress,
  TAP_SUPPRESS_AFTER_LONG_PRESS_MS,
} from './tapAfterLongPressGuard';

describe('shouldSuppressTapAfterLongPress', () => {
  it('does not suppress when no long press ended', () => {
    assert.equal(shouldSuppressTapAfterLongPress(null, 1000), false);
  });

  it('suppresses taps within the window after long press ends', () => {
    const ended = 1000;
    assert.equal(shouldSuppressTapAfterLongPress(ended, ended), true);
    assert.equal(shouldSuppressTapAfterLongPress(ended, ended + 349), true);
    assert.equal(shouldSuppressTapAfterLongPress(ended, ended + 350), false);
    assert.equal(shouldSuppressTapAfterLongPress(ended, ended + 500), false);
  });

  it('uses the shared 350 ms constant', () => {
    assert.equal(TAP_SUPPRESS_AFTER_LONG_PRESS_MS, 350);
  });
});
