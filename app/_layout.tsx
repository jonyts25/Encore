import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { bootLog } from '@/core/bootLog';
import '@/core/i18n';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { SessionProvider } from '@/modules/identity';
import { useColorScheme } from '@/core/ui/useColorScheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

bootLog('[BOOT 01] root layout module start');
bootLog('[BOOT 02] before preventAutoHideAsync');
SplashScreen.preventAutoHideAsync();
bootLog('[BOOT 03] after preventAutoHideAsync');

function BootGestureHandlerRootView({ children }: { children: ReactNode }) {
  useEffect(() => {
    bootLog('[BOOT 09] after GestureHandlerRootView mount');
  }, []);

  return <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>;
}

export default function RootLayout() {
  bootLog('[BOOT 04] fonts loading start');

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      bootLog('[BOOT 05] fonts loaded');
      bootLog('[BOOT 06] before SplashScreen.hideAsync');
      SplashScreen.hideAsync();
      bootLog('[BOOT 07] after SplashScreen.hideAsync');
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  bootLog('[BOOT 08] before GestureHandlerRootView');
  return (
    <BootGestureHandlerRootView>
      <I18nProvider>
        <SessionProvider>
          <RootLayoutNav />
        </SessionProvider>
      </I18nProvider>
    </BootGestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ title: '' }} />
        <Stack.Screen name="show/[id]" options={{ title: '' }} />
        <Stack.Screen name="lyrics" options={{ title: '' }} />
        <Stack.Screen
          name="live"
          options={{
            title: '',
            headerShown: false,
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
          }}
        />
        <Stack.Screen name="auth-callback" options={{ title: '', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
