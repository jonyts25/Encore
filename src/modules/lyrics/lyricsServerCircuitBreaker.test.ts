import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getLyricsServerCircuitStateForTests,
  isLyricsServerCircuitOpen,
  LYRICS_SERVER_CIRCUIT_OPEN_MS,
  recordLyricsServerBusy,
  recordLyricsServerSuccess,
  resetLyricsServerCircuitState,
  shouldBypassLyricsServer,
} from './lyricsServerCircuitBreaker';

describe('lyricsServerCircuitBreaker', () => {
  it('opens after two consecutive lyrics_busy responses', () => {
    resetLyricsServerCircuitState();
    const t0 = 1_000_000;

    assert.equal(shouldBypassLyricsServer(t0), false);
    recordLyricsServerBusy(t0);
    assert.equal(shouldBypassLyricsServer(t0), false);

    recordLyricsServerBusy(t0 + 100);
    assert.equal(shouldBypassLyricsServer(t0 + 100), true);
    assert.equal(
      getLyricsServerCircuitStateForTests().circuitOpenUntilMs,
      t0 + 100 + LYRICS_SERVER_CIRCUIT_OPEN_MS
    );
  });

  it('closes after five minutes and allows server again', () => {
    resetLyricsServerCircuitState();
    const t0 = 2_000_000;
    recordLyricsServerBusy(t0);
    recordLyricsServerBusy(t0);
    assert.equal(isLyricsServerCircuitOpen(t0), true);

    const afterWindow = t0 + LYRICS_SERVER_CIRCUIT_OPEN_MS;
    assert.equal(isLyricsServerCircuitOpen(afterWindow), false);
    assert.equal(shouldBypassLyricsServer(afterWindow), false);
    assert.equal(getLyricsServerCircuitStateForTests().consecutiveServerBusy, 0);
  });

  it('resets busy streak on server success', () => {
    resetLyricsServerCircuitState();
    recordLyricsServerBusy();
    recordLyricsServerSuccess();
    recordLyricsServerBusy();
    assert.equal(shouldBypassLyricsServer(), false);
  });
});
