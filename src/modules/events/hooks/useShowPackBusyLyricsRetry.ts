import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { startShowPackBusyLyricsRetryLoop } from '../showPackBusyLyricsRetry';

export function useShowPackBusyLyricsRetry(enabled: boolean): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    return startShowPackBusyLyricsRetryLoop(queryClient);
  }, [enabled, queryClient]);
}
