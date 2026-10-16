import 'expo-sqlite/localStorage/install';

import type { Session, User } from '@supabase/supabase-js';

export type LastKnownUser = {
  id: string;
  email: string | null;
  display_name: string | null;
};

const STORAGE_KEY = 'encore-last-known-user';

export function readLastKnownUser(): LastKnownUser | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastKnownUser;
    if (!parsed?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLastKnownUser(user: LastKnownUser): void {
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearLastKnownUser(): void {
  globalThis.localStorage.removeItem(STORAGE_KEY);
}

export function lastKnownUserFromSession(session: Session): LastKnownUser {
  const user = session.user;
  const displayName =
    (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
  };
}

export function lastKnownUserToUser(lastKnown: LastKnownUser): User {
  return {
    id: lastKnown.id,
    email: lastKnown.email ?? undefined,
    user_metadata: {
      display_name: lastKnown.display_name ?? undefined,
    },
  } as unknown as User;
}

export function mergeLastKnownUser(
  current: LastKnownUser | null,
  patch: Partial<LastKnownUser>
): LastKnownUser | null {
  if (!current && !patch.id) return null;
  return {
    id: patch.id ?? current!.id,
    email: patch.email ?? current?.email ?? null,
    display_name: patch.display_name ?? current?.display_name ?? null,
  };
}
