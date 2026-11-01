import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { SetlistFmProvider } from './adapter';

describe('SetlistFmProvider.searchSetlists', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('treats HTTP 404 as empty results (setlist.fm search miss)', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';

    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.match(url, /\/1\.0\/search\/setlists\?/);
      return new Response('not found', { status: 404 });
    });

    const provider = new SetlistFmProvider();
    const results = await provider.searchSetlists({
      artistMbid: '55441123-89a2-49ab-ae3f-df7a3e86835a',
      date: '26-10-2024',
    });
    assert.deepEqual(results, []);
  });

  it('parses setlist array from search JSON', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';

    mock.method(globalThis, 'fetch', async () => {
      return new Response(
        JSON.stringify({
          setlist: [
            {
              id: '5354c34d',
              eventDate: '26-10-2024',
              artist: { mbid: '55441123-89a2-49ab-ae3f-df7a3e86835a', name: 'Maná' },
              venue: {
                name: 'Explanada de la Feria',
                city: {
                  name: 'León',
                  country: { code: 'MX', name: 'Mexico' },
                },
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const provider = new SetlistFmProvider();
    const results = await provider.searchSetlists({
      artistName: 'Maná',
      date: '26-10-2024',
    });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.id, '5354c34d');
  });
});
