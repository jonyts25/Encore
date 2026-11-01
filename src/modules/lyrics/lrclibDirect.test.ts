import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  fetchLrclibSearchDirect,
  LRCLIB_CLIENT_HEADER,
  LRCLIB_DIRECT_BASE_URL,
} from './lrclibDirect';

describe('fetchLrclibSearchDirect', () => {
  it('sends Lrclib-Client header and picks synced record', async () => {
    let capturedHeader: string | null = null;

    const fetchFn = async (url: string, init?: RequestInit) => {
      assert.ok(url.startsWith(`${LRCLIB_DIRECT_BASE_URL}/search?`));
      capturedHeader = (init?.headers as Record<string, string>)['Lrclib-Client'];
      return new Response(
        JSON.stringify([
          { id: 1, plainLyrics: 'a', duration: 100 },
          {
            id: 2,
            trackName: 'Track',
            artistName: 'Band',
            plainLyrics: 'lyrics',
            syncedLyrics: '[00:02.00] line',
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    };

    const data = await fetchLrclibSearchDirect('Band', 'Track', fetchFn);
    assert.equal(capturedHeader, LRCLIB_CLIENT_HEADER);
    assert.equal(data?.lyrics.id, '2');
    assert.equal(data?.lyrics.synced_lines.length, 1);
  });
});
