import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

const SHOW_ID = '11111111-1111-4111-8111-111111111111';

describe('requestShowEnrich', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('sends Authorization bearer header', async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ status: 'started' }), {
        status: 202,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const { requestShowEnrich } = await import('./enrichShowApi');
    const result = await requestShowEnrich(SHOW_ID, 'test-access-token');

    assert.equal(result.status, 'started');
    const headers = capturedInit?.headers as Record<string, string> | undefined;
    assert.equal(headers?.Authorization, 'Bearer test-access-token');
  });
});
