import * as Linking from 'expo-linking';
import { useEffect } from 'react';

import { completeAuthFromUrl, isAuthCallbackUrl } from './authCallback';

export function useAuthDeepLink() {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url || !isAuthCallbackUrl(url)) return;
      await completeAuthFromUrl(url);
    };

    void Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => subscription.remove();
  }, []);
}
