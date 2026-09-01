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
        name="catalog"
        options={{
          title: t('catalog.tab'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'music.note.list', android: 'queue_music', web: 'queue_music' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t('home.tab'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'house', android: 'home', web: 'home' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('identity.tab'),
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{ ios: 'person.circle', android: 'person', web: 'person' }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
