import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isNativeCameraOptedOut } from './nativeCameraFlag';

describe('isNativeCameraOptedOut', () => {
  it('only opts out on explicit false values', () => {
    assert.equal(isNativeCameraOptedOut(undefined), false);
    assert.equal(isNativeCameraOptedOut(''), false);
    assert.equal(isNativeCameraOptedOut('true'), false);
    assert.equal(isNativeCameraOptedOut('false'), true);
    assert.equal(isNativeCameraOptedOut('0'), true);
  });
});
