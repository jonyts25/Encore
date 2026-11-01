import { useFonts } from 'expo-font';

export function useShowNightShareFonts(): { loaded: boolean; error: Error | null } {
  const [loaded, error] = useFonts({
    'Inter-Regular': require('../../../assets/fonts/Inter-Regular.ttf'),
    'SpaceGrotesk-Bold': require('../../../assets/fonts/SpaceGrotesk-Bold.ttf'),
    'PermanentMarker-Regular': require('../../../assets/fonts/PermanentMarker-Regular.ttf'),
  });

  return { loaded, error: error ?? null };
}
