import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { queryKeys } from '@/core/query';
import { useSession } from '@/modules/identity';
import { fetchShowPrediction } from '@/modules/setlist/api';
import type { SetlistPrediction } from '@/modules/setlist/types';

import { requestShowEnrich } from '../enrichShowApi';
import { shouldRequestBackgroundEnrich } from '../enrichShowLogic';
import { prefetchShowPack } from '../showPack';
import type { Show } from '../types';
import { getShowPhase } from '../visibility';

const ENRICH_POLL_MS = 10_000;
const ENRICH_POLL_MAX_MS = 3 * 60_000;

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
  const pollStartedAtRef = useRef<number | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (!enabled || !show || !session?.access_token) {
      setIsEnriching(false);
      return;
    }

    const phase = getShowPhase(show);
    const isFutureShow = phase !== 'past';
    const wantsEnrich = shouldRequestBackgroundEnrich({
      isFutureShow,
      structure: prediction?.structure,
      enrichedAt: show.enriched_at,
    });

    if (!wantsEnrich) {
      if (prediction?.structure !== 'insufficient_data') {
        setIsEnriching(false);
      }
      return;
    }

    setIsEnriching(true);

    if (startedRef.current === show.id) return;
    startedRef.current = show.id;
    pollStartedAtRef.current = Date.now();

    void (async () => {
      try {
        await requestShowEnrich(show.id, session.access_token);
      } catch (error) {
        if (__DEV__) {
          console.warn('[Encore] show enrich failed', error);
        }
        setIsEnriching(false);
      }
    })();
  }, [
    enabled,
    prediction?.structure,
    session?.access_token,
    show,
  ]);

  useEffect(() => {
    if (!enabled || !show || !session?.access_token || !isEnriching) return;

    const poll = async () => {
      const startedAt = pollStartedAtRef.current ?? Date.now();
      if (Date.now() - startedAt > ENRICH_POLL_MAX_MS) {
        setIsEnriching(false);
        return;
      }

      try {
        const fresh = await fetchShowPrediction(show.id);
        queryClient.setQueryData(queryKeys.prediction(show.id), fresh);
        await queryClient.invalidateQueries({ queryKey: queryKeys.show(show.id) });

        if (fresh?.structure !== 'insufficient_data' && (fresh?.songs.length ?? 0) > 0) {
          setIsEnriching(false);
          const refreshedShow = queryClient.getQueryData<Show>(queryKeys.show(show.id)) ?? show;
          void prefetchShowPack(refreshedShow, queryClient, { force: true });
          return;
        }

        if (fresh?.structure !== 'insufficient_data') {
          setIsEnriching(false);
          void prefetchShowPack(show, queryClient, { force: true });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('[Encore] show enrich poll failed', error);
        }
      }
    };

    void poll();
    const interval = setInterval(() => {
      void poll();
    }, ENRICH_POLL_MS);

    return () => clearInterval(interval);
  }, [enabled, isEnriching, queryClient, session?.access_token, show]);

  useEffect(() => {
    if (!isEnriching || !prediction) return;
    if (prediction.structure !== 'insufficient_data' && prediction.songs.length > 0) {
      setIsEnriching(false);
    }
  }, [isEnriching, prediction]);

  return { isEnriching };
}
