import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;
const FIVE_MINUTES_MS = 1000 * 60 * 5;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      gcTime: SEVEN_DAYS_MS,
      staleTime: FIVE_MINUTES_MS,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 2,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 0,
    },
  },
});

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected != null ? state.isConnected : Boolean(state.isInternetReachable));
  })
);

if (Platform.OS !== 'web') {
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status) => {
      handleFocus(status === 'active');
    });
    return () => subscription.remove();
  });
}

export const QUERY_PERSIST_MAX_AGE_MS = SEVEN_DAYS_MS;
