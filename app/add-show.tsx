import { Stack } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { AddShowContent } from '@/modules/events';

export default function AddShowScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('addShow.title') }} />
      <AddShowContent />
    </>
  );
}
