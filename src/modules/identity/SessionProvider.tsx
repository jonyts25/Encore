import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { supabase } from '@/core/api/supabase';
import { bootLog } from '@/core/bootLog';
import { i18n, setLocale, type SupportedLocale } from '@/core/i18n';

import {
  clearLastKnownUser,
  lastKnownUserFromSession,
  lastKnownUserToUser,
  mergeLastKnownUser,
  readLastKnownUser,
  writeLastKnownUser,
  type LastKnownUser,
} from './lastKnownUser';
import {
  classifyRefreshResult,
  deriveAuthStatus,
  shouldClearStoredUserOnAuthError,
  type AuthStatus,
} from './sessionStatus';
import {
  getCurrentSession,
  refreshAuthSession,
  signInWithPassword,
  signOut as signOutApi,
  signUpWithPassword,
  subscribeToAuthChanges,
} from './api';
import { useAuthDeepLink } from './useAuthDeepLink';
import type { SignUpResult, SystemRole } from './types';

type SessionContextValue = {
  authStatus: AuthStatus;
  isLoading: boolean;
  isGuest: boolean;
  isOfflineSession: boolean;
  session: Session | null;
  user: User | null;
  lastKnownUser: LastKnownUser | null;
  role: SystemRole;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

function currentAppLocale(): SupportedLocale {
  return i18n.language.startsWith('en') ? 'en' : 'es';
}

function persistUserFromSession(session: Session | null): LastKnownUser | null {
  if (!session?.user) return readLastKnownUser();
  const next = lastKnownUserFromSession(session);
  writeLastKnownUser(next);
  return next;
}

function applyRefreshOutcome(
  outcome: ReturnType<typeof classifyRefreshResult>,
  setSession: (session: Session | null) => void,
  setLastKnownUser: (user: LastKnownUser | null) => void
) {
  if (outcome.kind === 'guest') {
    clearLastKnownUser();
    setSession(null);
    setLastKnownUser(null);
    return;
  }
  if (outcome.kind === 'signed_in') {
    setSession(outcome.session);
    setLastKnownUser(persistUserFromSession(outcome.session));
    return;
  }
  setSession(outcome.session);
  setLastKnownUser(readLastKnownUser());
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [lastKnownUser, setLastKnownUser] = useState<LastKnownUser | null>(() => readLastKnownUser());
  const [isLoading, setIsLoading] = useState(true);

  useAuthDeepLink();

  const syncSessionFromStorage = useCallback(async () => {
    const saved = readLastKnownUser();
    const result = await refreshAuthSession();
    const outcome = classifyRefreshResult({
      session: result.session,
      lastKnownUser: saved,
      error: result.error,
    });
    applyRefreshOutcome(outcome, setSession, setLastKnownUser);
  }, []);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void supabase.auth.startAutoRefresh();
        void syncSessionFromStorage();
      } else {
        void supabase.auth.stopAutoRefresh();
      }
    };

    void supabase.auth.startAutoRefresh();
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      subscription.remove();
      void supabase.auth.stopAutoRefresh();
    };
  }, [syncSessionFromStorage]);

  useEffect(() => {
    let mounted = true;

    bootLog('[BOOT 10] before SessionProvider getCurrentSession');
    void (async () => {
      try {
        const initialSession = await getCurrentSession();
        if (!mounted) return;
        setSession(initialSession);
        setLastKnownUser(persistUserFromSession(initialSession));
      } catch (error) {
        if (!mounted) return;

        if (shouldClearStoredUserOnAuthError(error)) {
          clearLastKnownUser();
          setSession(null);
          setLastKnownUser(null);
        } else {
          const { data } = await supabase.auth.getSession();
          const cachedSession = data.session ?? null;
          setSession(cachedSession);
          const saved = readLastKnownUser();
          setLastKnownUser(saved ?? persistUserFromSession(cachedSession));
        }
      } finally {
        if (mounted) {
          bootLog('[BOOT 11] after SessionProvider getCurrentSession');
          setIsLoading(false);
        }
      }
    })();

    const unsubscribe = subscribeToAuthChanges((event, nextSession) => {
      if (nextSession) {
        setSession(nextSession);
        setLastKnownUser(persistUserFromSession(nextSession));
        return;
      }

      if (event === 'SIGNED_OUT') {
        clearLastKnownUser();
        setSession(null);
        setLastKnownUser(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithPassword(email, password);
    setSession(nextSession);
    setLastKnownUser(persistUserFromSession(nextSession));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const result = await signUpWithPassword(
      email,
      password,
      displayName,
      currentAppLocale()
    );
    const nextSession = await getCurrentSession();
    setSession(nextSession);
    setLastKnownUser(
      mergeLastKnownUser(persistUserFromSession(nextSession), { display_name: displayName }) ??
        persistUserFromSession(nextSession)
    );
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await signOutApi();
    clearLastKnownUser();
    setSession(null);
    setLastKnownUser(null);
  }, []);

  const effectiveUser = useMemo(() => {
    if (session?.user) return session.user;
    if (lastKnownUser) return lastKnownUserToUser(lastKnownUser);
    return null;
  }, [lastKnownUser, session?.user]);

  const authStatus = deriveAuthStatus({ session, lastKnownUser });
  const isOfflineSession = authStatus === 'signed_in_offline';
  const isGuest = !isLoading && authStatus === 'guest';

  const value = useMemo<SessionContextValue>(
    () => ({
      authStatus,
      isLoading,
      isGuest,
      isOfflineSession,
      session,
      user: effectiveUser,
      lastKnownUser,
      role: effectiveUser ? 'user' : 'guest',
      signIn,
      signUp,
      signOut,
    }),
    [
      authStatus,
      effectiveUser,
      isGuest,
      isLoading,
      isOfflineSession,
      lastKnownUser,
      session,
      signIn,
      signOut,
      signUp,
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

export function applyProfileLocale(locale: string | null | undefined) {
  if (locale === 'es' || locale === 'en') {
    setLocale(locale);
  }
}

export function updateLastKnownDisplayName(displayName: string | null) {
  const current = readLastKnownUser();
  if (!current) return;
  writeLastKnownUser({ ...current, display_name: displayName });
}
