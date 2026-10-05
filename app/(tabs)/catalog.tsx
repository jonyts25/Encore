import { CatalogScreenContent } from '@/modules/catalog';
import { ThemedView } from '@/core/ui/Themed';

export default function CatalogScreen() {
  return (
    <ThemedView style={{ flex: 1 }}>
      <CatalogScreenContent />
    </ThemedView>
  );
}
