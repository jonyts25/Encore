import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { notifyRecordingSaveFinished, waitForRecordingSave } from './recordingSaveTracker';

describe('recordingSaveTracker', () => {
  it('resolves waitForRecordingSave when notifyRecordingSaveFinished runs', async () => {
    const pending = waitForRecordingSave();
    notifyRecordingSaveFinished();
    await pending;
    assert.ok(true);
  });
});
