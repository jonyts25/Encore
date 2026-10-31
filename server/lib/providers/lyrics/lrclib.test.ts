import assert from 'node:assert/strict';
import test from 'node:test';

import { LyricsBusyError } from './lrclibErrors';
import type { LrclibFetchFn } from './lrclibRequest';
import {
  LRCLIB_FETCH_TIMEOUT_MS,
  LRCLIB_SONG_BUDGET_MS,
  lrclibRequestDirectWithFetch,
  parseRetryAfterMs,
} from './lrclibRequest';
import { LrclibRequestQueue } from './lrclibQueue';

function neverRespondingFetch(rejectAfterMs: number): LrclibFetchFn {
  return async (_url, init) => {
    assert.ok(init?.signal instanceof AbortSignal, 'fetch must receive AbortSignal.timeout');
    await new Promise<Response>((_resolve, reject) => {
      const timer = setTimeout(
        () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })),
        rejectAfterMs
      );
      init.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        },
        { once: true }
      );
    });
    return new Response('never');
  };
}

test('parseRetryAfterMs reads seconds from Retry-After header', () => {
  const response = new Response(null, { headers: { 'retry-after': '3' } });
  assert.equal(parseRetryAfterMs(response), 3000);
});

test('lrclibRequestDirectWithFetch throws busy when Retry-After exceeds 5s', async () => {
  await assert.rejects(
    async () => {
      await lrclibRequestDirectWithFetch(
        '/search?q=1',
        'https://lrclib.test',
        async () =>
          new Response(null, {
            status: 503,
            headers: { 'retry-after': '12' },
          })
      );
    },
    LyricsBusyError
  );
});

test('lrclibRequestDirectWithFetch finishes within song budget on hanging fetch', async () => {
  const started = Date.now();

  await assert.rejects(
    async () => {
      await lrclibRequestDirectWithFetch(
        '/search?q=hang',
        'https://lrclib.test',
        neverRespondingFetch(60),
        {
          fetchTimeoutMs: 60,
          songBudgetMs: 250,
          retryDelaysMs: [0, 50, 50],
        }
      );
    },
    LyricsBusyError
  );

  assert.ok(Date.now() - started < LRCLIB_SONG_BUDGET_MS);
});

test('production constants keep per-song budget at 20s with 8s fetch cap', () => {
  assert.equal(LRCLIB_SONG_BUDGET_MS, 20_000);
  assert.equal(LRCLIB_FETCH_TIMEOUT_MS, 8000);
});

test('LrclibRequestQueue releases slot when first fetch hangs until timeout', async () => {
  const queue = new LrclibRequestQueue(1);
  const events: string[] = [];

  const first = queue.enqueue(async () => {
    events.push('first-start');
    await lrclibRequestDirectWithFetch(
      '/search?q=1',
      'https://lrclib.test',
      neverRespondingFetch(60),
      {
        fetchTimeoutMs: 60,
        songBudgetMs: 80,
        retryDelaysMs: [0],
      }
    );
  });

  const second = queue.enqueue(async () => {
    events.push('second-run');
    return 'ok';
  });

  const [firstResult, secondResult] = await Promise.allSettled([first, second]);
  assert.equal(firstResult.status, 'rejected');
  assert.equal(secondResult.status, 'fulfilled');
  assert.deepEqual(events, ['first-start', 'second-run']);
});
