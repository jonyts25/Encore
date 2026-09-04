import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTranslation } from '@/core/i18n';
import { LiveCameraContent } from '@/modules/live';

export default function LiveScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ artist?: string; title?: string }>();
  const artist = typeof params.artist === 'string' ? params.artist : '';
  const title = typeof params.title === 'string' ? params.title : '';

  return (
    <>
      <StatusBar style="light" />
      <Stack.Screen options={{ title: t('live.screenTitle'), headerShown: false }} />
      <LiveCameraContent artist={artist} title={title} />
    </>
  );
}
