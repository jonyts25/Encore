import { Stack } from 'expo-router';

import { useTranslation } from '@/core/i18n';

export default function ShowDetailLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackTitle: t('common.back') }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="setlist"
        options={{ headerShown: true, title: t('memory.setlist.title'), headerBackTitle: t('common.back') }}
      />
    </Stack>
  );
}
