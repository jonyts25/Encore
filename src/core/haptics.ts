import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticSelection(): void {
  if (Platform.OS === 'web') return;
  void Haptics.selectionAsync();
}

export function hapticImpactMedium(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticImpactLight(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
