import { useLocalSearchParams } from 'expo-router';

import { ConfirmSetlistContent } from '@/modules/memory/components/ConfirmSetlistContent';

export default function ConfirmSetlistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id || typeof id !== 'string') {
    return null;
  }

  return <ConfirmSetlistContent showId={id} />;
}
