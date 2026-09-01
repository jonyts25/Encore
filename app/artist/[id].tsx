import { Stack, useLocalSearchParams } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { ArtistDetailContent } from '@/modules/catalog';

export default function ArtistDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id || typeof id !== 'string') {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: t('catalog.artistDetail') }} />
      <ArtistDetailContent artistId={id} />
    </>
  );
}
