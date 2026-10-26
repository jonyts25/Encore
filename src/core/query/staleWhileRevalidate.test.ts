import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createStaleWhileRevalidateQueryFn } from './staleWhileRevalidate';

describe('createStaleWhileRevalidateQueryFn', () => {
  it('returns cached data when the network fetch fails', async () => {
    const queryFn = createStaleWhileRevalidateQueryFn({
      fetchFresh: async () => {
        throw new Error('network request failed');
      },
      readCache: async () => ({ going: [{ id: 'show-1' }] }),
      writeCache: async () => {},
    });

    const result = await queryFn();
    assert.deepEqual(result, { going: [{ id: 'show-1' }] });
  });

  it('rethrows when fetch fails and cache is empty', async () => {
    const queryFn = createStaleWhileRevalidateQueryFn({
      fetchFresh: async () => {
        throw new Error('offline');
      },
      readCache: async () => null,
      writeCache: async () => {},
    });

    await assert.rejects(() => queryFn(), /offline/);
  });
});
