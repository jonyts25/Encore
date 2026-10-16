import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Appearance } from 'react-native';

import { LiveSessionProvider } from '@/modules/live/context/LiveSessionContext';
import {
  applyNativeColorScheme,
  EncoreThemeProvider,
  readStoredThemePreference,
} from '@/core/ui/theme';

function LiveNativeAppearanceLock() {
  useEffect(() => {
    Appearance.setColorScheme('dark');
    return () => {
      applyNativeColorScheme(readStoredThemePreference());
    };
  }, []);

  return null;
}

export default function LiveStackLayout() {
  return (
    <EncoreThemeProvider forceScheme="dark">
      <LiveSessionProvider>
        <LiveNativeAppearanceLock />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="songs"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.6, 1],
            sheetGrabberVisible: true,
            contentStyle: { backgroundColor: 'rgba(28,28,30,0.92)' },
          }}
        />
        </Stack>
      </LiveSessionProvider>
    </EncoreThemeProvider>
  );
}
