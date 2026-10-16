import { Stack } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { ExploreScreenContent } from '@/modules/events/components/ExploreScreenContent';
import { useEncoreTheme } from '@/core/ui/theme';

export default function ExploreScreen() {
  const { t } = useTranslation();
  const { tokens } = useEncoreTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('explore.title'),
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: tokens.background },
        }}
      />
      <ExploreScreenContent />
    </>
  );
}
