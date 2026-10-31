import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { bootLog } from '@/core/bootLog';
import '@/core/i18n';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { QueryProvider } from '@/core/query';
import { useShowPackBusyLyricsRetry } from '@/modules/events/hooks/useShowPackBusyLyricsRetry';
import { SessionProvider, useSession } from '@/modules/identity';
import { EncoreThemeProvider, useEncoreTheme } from '@/core/ui/theme';
import { AppErrorBoundary } from '@/core/ui/AppErrorBoundary';


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
          <QueryProvider>
            <EncoreThemeProvider>
              <AppErrorBoundary>
                <RootLayoutNav />
              </AppErrorBoundary>
            </EncoreThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </I18nProvider>
    </BootGestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { isGuest } = useSession();
  useShowPackBusyLyricsRetry(!isGuest);
  const { resolvedScheme, tokens } = useEncoreTheme();
  const baseTheme = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: tokens.background,
      card: tokens.surface,
      text: tokens.text,
      border: tokens.separator,
      primary: tokens.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ title: '', headerLargeTitle: false }} />
        <Stack.Screen name="show/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="add-show" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
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
