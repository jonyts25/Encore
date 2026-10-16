import 'expo-sqlite/localStorage/install';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { applyNativeColorScheme } from './nativeAppearance';
import { type ColorScheme, tokensForScheme, type ThemeTokens } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'encore-theme-preference';

type EncoreThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedScheme: ColorScheme;
  tokens: ThemeTokens;
};

const EncoreThemeContext = createContext<EncoreThemeContextValue | null>(null);

export function readStoredThemePreference(): ThemePreference {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // ignore
  }
  return 'system';
}

type EncoreThemeProviderProps = {
  children: ReactNode;
  forceScheme?: ColorScheme;
};

export function EncoreThemeProvider({ children, forceScheme }: EncoreThemeProviderProps) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreferenceState(readStoredThemePreference());
  }, []);

  useEffect(() => {
    if (forceScheme) return;
    applyNativeColorScheme(preference);
  }, [forceScheme, preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const resolvedScheme: ColorScheme = useMemo(() => {
    if (forceScheme) return forceScheme;
    if (preference === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return preference;
  }, [forceScheme, preference, systemScheme]);

  const value = useMemo(
    () => ({
      preference,
      setPreference,
      resolvedScheme,
      tokens: tokensForScheme(resolvedScheme),
    }),
    [preference, resolvedScheme, setPreference]
  );

  return <EncoreThemeContext.Provider value={value}>{children}</EncoreThemeContext.Provider>;
}

export function useEncoreTheme(): EncoreThemeContextValue {
  const ctx = useContext(EncoreThemeContext);
  if (!ctx) {
    throw new Error('useEncoreTheme must be used within EncoreThemeProvider');
  }
  return ctx;
}
