import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useIsOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected != null ? state.isConnected : Boolean(state.isInternetReachable);
      setIsOffline(!online);
    });

    void NetInfo.fetch().then((state) => {
      const online =
        state.isConnected != null ? state.isConnected : Boolean(state.isInternetReachable);
      setIsOffline(!online);
    });

    return unsubscribe;
  }, []);

  return isOffline;
}
