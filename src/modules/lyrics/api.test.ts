import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ApiError } from '@/core/api/client';
import { toLyricsFetchError, LyricsBusyError } from './errors';
import { shouldTryDirectLrclibFallback } from './fetchLyricsFallback';

describe('fetchLyrics server busy handling', () => {
  it('maps server lyrics_busy to LyricsBusyError when direct fallback fails', () => {
    const serverError = new ApiError('busy', 503, { error: 'lyrics_busy' });
    assert.equal(shouldTryDirectLrclibFallback(serverError), true);
    assert.throws(() => {
      throw toLyricsFetchError(serverError);
    }, LyricsBusyError);
  });
});
