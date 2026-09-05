import type { AuthError, Session, User } from '@supabase/supabase-js';

import { supabase } from '@/core/api/supabase';

import type { Profile, SignUpResult, SystemRole } from './types';

const PROFILE_COLUMNS = 'user_id, display_name, locale, home_city, role';

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data.user) {
    await ensureProfileForUser(data.user);
  }

  return data.session;
}

async function ensureProfileForUser(user: User) {
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  const displayName =
    (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
    user.email?.split('@')[0] ||
    'Fan';

  await upsertProfile(user.id, {
    display_name: displayName,
    locale: 'es',
    home_city: null,
  });

  return fetchProfile(user.id);
}

function isDuplicateEmailError(error: AuthError): boolean {
  const message = error.message.toLowerCase();
  return (
    error.code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('user already exists')
  );
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string,
  locale: string
): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'encore://auth-callback',
      data: {
        display_name: displayName,
      },
    },
  });
  if (error) {
    if (isDuplicateEmailError(error)) {
      return { needsEmailConfirmation: false, emailAlreadyRegistered: true };
    }
    throw error;
  }

  if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
    return { needsEmailConfirmation: false, emailAlreadyRegistered: true };
  }

  if (data.session && data.user) {
    await upsertProfile(data.user.id, {
      display_name: displayName,
      locale,
      home_city: null,
    });
    return { needsEmailConfirmation: false };
  }

  return { needsEmailConfirmation: true };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}

export async function upsertProfile(
  userId: string,
  patch: Pick<Profile, 'display_name' | 'locale' | 'home_city'>
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      ...patch,
      role: 'user',
    },
    { onConflict: 'user_id' }
  );

  if (error) throw error;
}

export function resolveRole(profile: Profile | null, user: User | null): SystemRole {
  if (!user) return 'guest';
  const role = profile?.role;
  if (
    role === 'user' ||
    role === 'pro' ||
    role === 'contributor' ||
    role === 'moderator' ||
    role === 'admin'
  ) {
    return role;
  }
  return 'user';
}

export function subscribeToAuthChanges(
  onChange: (session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}
