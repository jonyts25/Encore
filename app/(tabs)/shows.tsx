import { UpcomingShowsContent } from '@/modules/events';
import { ThemedView } from '@/core/ui/Themed';

export default function ShowsScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <UpcomingShowsContent />
    </ThemedView>
  );
}
