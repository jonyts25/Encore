import { Stack, useLocalSearchParams } from 'expo-router';

import { useTranslation } from '@/core/i18n';
import { ThemedView } from '@/core/ui/Themed';
import { LyricsScreenContent } from '@/modules/lyrics';

export default function LyricsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ artist?: string; title?: string }>();
  const artist = typeof params.artist === 'string' ? params.artist : '';
  const title = typeof params.title === 'string' ? params.title : '';

  return (
    <>
      <Stack.Screen options={{ title: t('lyrics.screenTitle') }} />
      <ThemedView style={{ flex: 1 }}>
        <LyricsScreenContent artist={artist} title={title} />
      </ThemedView>
    </>
  );
}
