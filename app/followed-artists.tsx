import { Stack } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { CatalogScreenContent } from '@/modules/catalog';

export default function FollowedArtistsScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('profile.yourArtistsTitle') }} />
      <CatalogScreenContent mode="followedOnly" />
    </>
  );
}
