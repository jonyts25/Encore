import { HomeShowsContent } from '@/modules/events';
import { ThemedView } from '@/core/ui/Themed';

export default function HomeScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <HomeShowsContent />
    </ThemedView>
  );
}
