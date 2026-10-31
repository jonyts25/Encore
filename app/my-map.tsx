import { Stack } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { MyMapScreenContent } from '@/modules/events/components/MyMapScreenContent';

export default function MyMapScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('myMap.title') }} />
      <MyMapScreenContent />
    </>
  );
}
