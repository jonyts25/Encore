import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuthRetryableFetchError } from '@supabase/auth-js';

import {
  classifyRefreshResult,
  deriveAuthStatus,
  shouldClearStoredUserOnAuthError,
} from './sessionStatus';

const savedUser = {
  id: 'user-1',
  email: 'fan@example.com',
  display_name: 'Fan',
};

describe('deriveAuthStatus', () => {
  it('returns signed_in when a session user exists', () => {
    assert.equal(
      deriveAuthStatus({
        session: { user: { id: 'user-1' } } as never,
        lastKnownUser: savedUser,
      }),
      'signed_in'
    );
  });

  it('returns signed_in_offline when only lastKnownUser exists', () => {
    assert.equal(
      deriveAuthStatus({
        session: null,
        lastKnownUser: savedUser,
      }),
      'signed_in_offline'
    );
  });

  it('returns guest when there is no session or saved user', () => {
    assert.equal(
      deriveAuthStatus({
        session: null,
        lastKnownUser: null,
      }),
      'guest'
    );
  });
});

describe('shouldClearStoredUserOnAuthError', () => {
  it('does not clear on network failures', () => {
    const error = new AuthRetryableFetchError('fetch failed', 0);
    assert.equal(shouldClearStoredUserOnAuthError(error), false);
  });

  it('clears when refresh token is invalid', () => {
    assert.equal(
      shouldClearStoredUserOnAuthError({ code: 'invalid_refresh_token', message: 'bad' }),
      true
    );
  });

  it('does not clear on expired jwt alone', () => {
    assert.equal(
      shouldClearStoredUserOnAuthError({ message: 'JWT expired' }),
      false
    );
  });
});

describe('classifyRefreshResult', () => {
  it('keeps signed_in_offline when token refresh fails offline', () => {
    const staleSession = { user: { id: 'user-1' } } as never;
    const outcome = classifyRefreshResult({
      session: staleSession,
      lastKnownUser: savedUser,
      error: new AuthRetryableFetchError('network request failed', 0),
    });
    assert.equal(outcome.kind, 'signed_in_offline');
  });

  it('treats expired token without network as offline session, not guest', () => {
    const outcome = classifyRefreshResult({
      session: null,
      lastKnownUser: savedUser,
      error: new AuthRetryableFetchError('fetch failed', 0),
    });
    assert.equal(outcome.kind, 'signed_in_offline');
    assert.equal(deriveAuthStatus({ session: null, lastKnownUser: savedUser }), 'signed_in_offline');
  });

  it('clears to guest when refresh token is rejected online', () => {
    const outcome = classifyRefreshResult({
      session: null,
      lastKnownUser: savedUser,
      error: { code: 'invalid_refresh_token', message: 'invalid refresh token' },
    });
    assert.equal(outcome.kind, 'guest');
  });
});
