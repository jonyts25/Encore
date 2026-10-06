import { Stack, useLocalSearchParams } from 'expo-router';

import { ScrollView } from 'react-native';

import { useTranslation } from '@/core/i18n';
import { ThemedView } from '@/core/ui/Themed';
import { LyricsScreenContent } from '@/modules/lyrics';

export default function LyricsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ artist?: string; title?: string; showId?: string }>();
  const artist = typeof params.artist === 'string' ? params.artist : '';
  const title = typeof params.title === 'string' ? params.title : '';
  const showId = typeof params.showId === 'string' ? params.showId : undefined;

  return (
    <>
      <Stack.Screen options={{ title: t('lyrics.screenTitle') }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView style={{ flexGrow: 1 }}>
          <LyricsScreenContent artist={artist} showId={showId} title={title} />
        </ThemedView>
      </ScrollView>
    </>
  );
}
