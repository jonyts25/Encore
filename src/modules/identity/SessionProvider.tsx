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

import { bootLog } from '@/core/bootLog';
import { i18n, setLocale, type SupportedLocale } from '@/core/i18n';

import {
  getCurrentSession,
  signInWithPassword,
  signOut as signOutApi,
  signUpWithPassword,
  subscribeToAuthChanges,
} from './api';
import { useAuthDeepLink } from './useAuthDeepLink';
import type { SignUpResult, SystemRole } from './types';

type SessionContextValue = {
  isLoading: boolean;
  isGuest: boolean;
  session: Session | null;
  user: User | null;
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

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useAuthDeepLink();

  useEffect(() => {
    let mounted = true;

    bootLog('[BOOT 10] before SessionProvider getCurrentSession');
    void getCurrentSession().then((initialSession) => {
      bootLog('[BOOT 11] after SessionProvider getCurrentSession');
      if (!mounted) return;
      setSession(initialSession);
      setIsLoading(false);
    });

    const unsubscribe = subscribeToAuthChanges((nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithPassword(email, password);
    setSession(nextSession);
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
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await signOutApi();
    setSession(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      isLoading,
      isGuest: !session,
      session,
      user: session?.user ?? null,
      role: session ? 'user' : 'guest',
      signIn,
      signUp,
      signOut,
    }),
    [isLoading, session, signIn, signOut, signUp]
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
