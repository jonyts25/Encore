import { Stack } from 'expo-router';
import { View } from 'react-native';

import { useEncoreTheme } from '@/core/ui/theme';
import { SettingsScreenContent } from '@/modules/identity/components/SettingsScreenContent';

export default function SettingsScreen() {
  const { tokens } = useEncoreTheme();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: tokens.background }}>
        <SettingsScreenContent />
      </View>
    </>
  );
}
