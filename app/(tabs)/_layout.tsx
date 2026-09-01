import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/core/ui/theme/Colors';
import { useColorScheme } from '@/core/ui/useColorScheme';
import { useClientOnlyValue } from '@/core/ui/useClientOnlyValue';
import { useTranslation } from '@/core/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('common.appName'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'music.note',
                android: 'music_note',
                web: 'music_note',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
