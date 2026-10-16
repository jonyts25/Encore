import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LiveCameraContent } from '@/modules/live';

const LIVE_KEEP_AWAKE_TAG = 'encore-live';

export default function LiveScreen() {
  useKeepAwake(LIVE_KEEP_AWAKE_TAG);

  const params = useLocalSearchParams<{ artist?: string; title?: string; showId?: string }>();
  const artist = typeof params.artist === 'string' ? params.artist : '';
  const title = typeof params.title === 'string' ? params.title : '';
  const showId = typeof params.showId === 'string' ? params.showId : undefined;

  return (
    <>
      <StatusBar style="light" />
      <LiveCameraContent artist={artist} showId={showId} title={title} />
    </>
  );
}
