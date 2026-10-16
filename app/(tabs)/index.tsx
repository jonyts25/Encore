import { HomeShowsContent } from '@/modules/events';
import { useEncoreTheme } from '@/core/ui/theme';
import { View } from 'react-native';

export default function HomeScreen() {
  const { tokens } = useEncoreTheme();

  return (
    <View style={{ flex: 1, backgroundColor: tokens.background }}>
      <HomeShowsContent />
    </View>
  );
}
