import { useEffect, useRef, useState } from 'react';

import { readVenueGeocodeAttemptAt, recordVenueGeocodeAttempt } from '@/core/db/venueGeocodeAttempts';

import { geocodeVenueWithAuth } from '../api';
import {
  filterVenueIdsEligibleForGeocode,
  uniqueUnlocatedVenueIds,
} from '../myMapVenueGeocodeLogic';
import type { Show } from '../types';

const INTER_REQUEST_DELAY_MS = 1100;

type UseMyMapVenueGeocodeBackfillOptions = {
  attendedShows: Show[];
  accessToken: string | null | undefined;
  isOffline: boolean;
  enabled: boolean;
  onFinished?: () => void;
};

export function useMyMapVenueGeocodeBackfill(options: UseMyMapVenueGeocodeBackfillOptions) {
  const { attendedShows, accessToken, isOffline, enabled, onFinished } = options;
  const [isGeocoding, setIsGeocoding] = useState(false);
  const runIdRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const unlocatedKey = uniqueUnlocatedVenueIds(attendedShows).sort().join(',');

  useEffect(() => {
    if (!enabled || isOffline || !accessToken?.trim()) return;

    const venueIds = uniqueUnlocatedVenueIds(attendedShows);
    if (venueIds.length === 0) return;

    const runId = ++runIdRef.current;
    let cancelled = false;

    void (async () => {
      const now = Date.now();
      const lastAttempts = new Map<string, number>();
      await Promise.all(
        venueIds.map(async (venueId) => {
          const attemptedAt = await readVenueGeocodeAttemptAt(venueId);
          if (attemptedAt != null) {
            lastAttempts.set(venueId, attemptedAt);
          }
        })
      );

      const eligible = filterVenueIdsEligibleForGeocode(venueIds, lastAttempts, now);
      if (eligible.length === 0 || cancelled || runId !== runIdRef.current) return;

      setIsGeocoding(true);
      try {
        for (const venueId of eligible) {
          if (cancelled || runId !== runIdRef.current) break;
          await geocodeVenueWithAuth(venueId, accessToken);
          await recordVenueGeocodeAttempt(venueId);
          await new Promise((resolve) => setTimeout(resolve, INTER_REQUEST_DELAY_MS));
        }
      } finally {
        if (!cancelled && runId === runIdRef.current) {
          setIsGeocoding(false);
          onFinishedRef.current?.();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, enabled, isOffline, unlocatedKey]);

  return { isGeocoding };
}
