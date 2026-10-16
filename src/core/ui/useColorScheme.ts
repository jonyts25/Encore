import { useEncoreTheme } from './theme';

export function useColorScheme(): 'light' | 'dark' {
  return useEncoreTheme().resolvedScheme;
}
