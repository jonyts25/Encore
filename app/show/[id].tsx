import { Stack, useLocalSearchParams } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { ShowDetailContent } from '@/modules/events';

export default function ShowDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id || typeof id !== 'string') {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: t('events.showDetail') }} />
      <ShowDetailContent showId={id} />
    </>
  );
}
