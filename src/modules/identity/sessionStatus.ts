import type { Session } from '@supabase/supabase-js';

import { isAuthNetworkError, isSessionInvalidError } from './authErrors';
import type { LastKnownUser } from './lastKnownUser';

export type AuthStatus = 'signed_in' | 'signed_in_offline' | 'guest';

export function deriveAuthStatus(input: {
  session: Session | null;
  lastKnownUser: LastKnownUser | null;
}): AuthStatus {
  if (input.session?.user) return 'signed_in';
  if (input.lastKnownUser) return 'signed_in_offline';
  return 'guest';
}

/** True only when the server rejected credentials and it was not a connectivity failure. */
export function shouldClearStoredUserOnAuthError(error: unknown): boolean {
  if (isAuthNetworkError(error)) return false;
  return isSessionInvalidError(error);
}

export function resolveLocalUserId(
  session: Session | null,
  lastKnownUser: LastKnownUser | null
): string | null {
  return session?.user?.id ?? lastKnownUser?.id ?? null;
}

export type RefreshSessionOutcome =
  | { kind: 'signed_in'; session: Session }
  | { kind: 'signed_in_offline'; session: Session | null }
  | { kind: 'guest' };

export function classifyRefreshResult(input: {
  session: Session | null;
  lastKnownUser: LastKnownUser | null;
  error: unknown | null;
}): RefreshSessionOutcome {
  if (input.error) {
    if (shouldClearStoredUserOnAuthError(input.error)) {
      return { kind: 'guest' };
    }
    return { kind: 'signed_in_offline', session: input.session };
  }
  if (input.session?.user) {
    return { kind: 'signed_in', session: input.session };
  }
  if (input.lastKnownUser) {
    return { kind: 'signed_in_offline', session: input.session };
  }
  return { kind: 'guest' };
}
