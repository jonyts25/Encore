import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { queryKeys } from '@/core/query';
import { useSession } from '@/modules/identity';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { requestShowEnrich } from '../enrichShowApi';
import { shouldRequestBackgroundEnrich } from '../enrichShowLogic';
import { prefetchShowPack } from '../showPack';
import type { Show } from '../types';
import { getShowPhase } from '../visibility';

type UseShowEnrichIfNeededOptions = {
  show: Show | null;
  prediction: SetlistPrediction | null;
  enabled?: boolean;
};

export function useShowEnrichIfNeeded({
  show,
  prediction,
  enabled = true,
}: UseShowEnrichIfNeededOptions) {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const startedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !show || !session?.access_token) return;

    const phase = getShowPhase(show);
    const isFutureShow = phase !== 'past';
    if (
      !shouldRequestBackgroundEnrich({
        isFutureShow,
        structure: prediction?.structure,
        enrichedAt: show.enriched_at,
      })
    ) {
      return;
    }

    if (startedRef.current === show.id) return;
    startedRef.current = show.id;

    void (async () => {
      try {
        const result = await requestShowEnrich(show.id, session.access_token);
        if (result.prediction) {
          queryClient.setQueryData(queryKeys.prediction(show.id), result.prediction);
        } else {
          await queryClient.invalidateQueries({ queryKey: queryKeys.prediction(show.id) });
        }
        await queryClient.invalidateQueries({ queryKey: queryKeys.show(show.id) });
        const refreshedShow = queryClient.getQueryData<Show>(queryKeys.show(show.id)) ?? show;
        void prefetchShowPack(refreshedShow, queryClient, { force: true });
      } catch (error) {
        if (__DEV__) {
          console.warn('[Encore] show enrich failed', error);
        }
      }
    })();
  }, [
    enabled,
    prediction?.structure,
    queryClient,
    session?.access_token,
    show,
  ]);
}
