export type ColorScheme = 'light' | 'dark';

export type ThemeTokens = {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  separator: string;
  accent: string;
  accentText: string;
  success: string;
  recording: string;
  zoomSelected: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  fillMuted: string;
  glassFallback: string;
};

export const lightTokens: ThemeTokens = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#111114',
  textSecondary: '#5E5E63',
  separator: '#E5E5EA',
  accent: '#C8361F',
  accentText: '#C8361F',
  success: '#1E7A34',
  recording: '#FF3B30',
  zoomSelected: '#FFD60A',
  tint: '#C8361F',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#C8361F',
  fillMuted: '#E9E9EE',
  glassFallback: 'rgba(255,255,255,0.72)',
};

export const darkTokens: ThemeTokens = {
  background: '#000000',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#A1A1A6',
  separator: '#38383A',
  accent: '#C8361F',
  accentText: '#FF7A5E',
  success: '#30D158',
  recording: '#FF3B30',
  zoomSelected: '#FFD60A',
  tint: '#FF7A5E',
  tabIconDefault: '#8E8E93',
  tabIconSelected: '#FF7A5E',
  fillMuted: '#2C2C2E',
  glassFallback: 'rgba(30,30,32,0.55)',
};

export function tokensForScheme(scheme: ColorScheme): ThemeTokens {
  return scheme === 'dark' ? darkTokens : lightTokens;
}
