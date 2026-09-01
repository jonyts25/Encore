import { HealthCheckPanel } from '@/core/ui/HealthCheckPanel';
import { ThemedView } from '@/core/ui/Themed';

export default function HomeScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <HealthCheckPanel />
    </ThemedView>
  );
}
