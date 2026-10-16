import { Stack, useLocalSearchParams } from 'expo-router';

import { LyricsScreenContent } from '@/modules/lyrics';

export default function LyricsScreen() {
  const params = useLocalSearchParams<{ artist?: string; title?: string; showId?: string }>();
  const artist = typeof params.artist === 'string' ? params.artist : '';
  const title = typeof params.title === 'string' ? params.title : '';
  const showId = typeof params.showId === 'string' ? params.showId : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LyricsScreenContent artist={artist} showId={showId} title={title} />
    </>
  );
}
