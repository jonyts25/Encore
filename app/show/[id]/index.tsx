import { useLocalSearchParams } from 'expo-router';

import { ShowDetailContent } from '@/modules/events';

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id || typeof id !== 'string') {
    return null;
  }

  return <ShowDetailContent showId={id} />;
}
