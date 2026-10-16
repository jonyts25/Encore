import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isNativeCameraTransientError,
  shouldFallbackFromNativeCamera,
} from './nativeCameraFallback';

describe('nativeCameraFallback', () => {
  it('treats interruption and disconnect as transient', () => {
    assert.equal(isNativeCameraTransientError('Camera interrupted: video device'), true);
    assert.equal(isNativeCameraTransientError('Camera disconnected: Back Camera'), true);
    assert.equal(isNativeCameraTransientError('Camera permission denied'), false);
  });

  it('falls back before ready or on permission/device errors', () => {
    assert.equal(shouldFallbackFromNativeCamera('Camera permission denied', true), true);
    assert.equal(shouldFallbackFromNativeCamera('No compatible camera available', true), true);
    assert.equal(shouldFallbackFromNativeCamera('Unknown startup error', false), true);
    assert.equal(shouldFallbackFromNativeCamera('Camera interrupted: phone call', true), false);
    assert.equal(shouldFallbackFromNativeCamera('Some runtime glitch', true), false);
  });
});
