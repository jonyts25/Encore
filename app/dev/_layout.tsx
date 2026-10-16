import { Redirect, Stack } from 'expo-router';

const devRoutesEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_LIVE_DIAGNOSTICS?.trim().toLowerCase() === 'true';

export default function DevLayout() {
  if (!devRoutesEnabled) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
