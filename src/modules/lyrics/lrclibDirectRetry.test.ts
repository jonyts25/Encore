import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fetchLrclibSearchDirect } from './lrclibDirect';
import { shouldRetryDirectLrclibResponse } from './lrclibDirectRetry';

describe('lrclibDirectRetry', () => {
  it('retries 503 with retry-after 1 then succeeds', async () => {
    let attempts = 0;
    const sleeps: number[] = [];

    const fetchFn = async () => {
      attempts += 1;
      if (attempts === 1) {
        return new Response('overloaded', {
          status: 503,
          headers: { 'retry-after': '1' },
        });
      }
      return new Response(
        JSON.stringify([
          {
            id: 99,
            trackName: 'Hit',
            artistName: 'Star',
            plainLyrics: 'Lyrics body',
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    };

    const data = await fetchLrclibSearchDirect('Star', 'Hit', {
      fetchFn,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      jitterMs: () => 50,
    });

    assert.equal(attempts, 2);
    assert.equal(sleeps[0], 1050);
    assert.equal(data?.lyrics.plain_lyrics, 'Lyrics body');
  });

  it('shouldRetryDirectLrclibResponse rejects long retry-after', () => {
    assert.equal(shouldRetryDirectLrclibResponse(503, 6000, 0), false);
    assert.equal(shouldRetryDirectLrclibResponse(503, 1000, 0), true);
  });
});
