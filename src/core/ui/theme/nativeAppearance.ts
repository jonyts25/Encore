import { Appearance } from 'react-native';

import type { ThemePreference } from './ThemeContext';

export function applyNativeColorScheme(preference: ThemePreference): void {
  if (preference === 'light') {
    Appearance.setColorScheme('light');
    return;
  }
  if (preference === 'dark') {
    Appearance.setColorScheme('dark');
    return;
  }
  Appearance.setColorScheme('unspecified');
}
