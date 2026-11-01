import type { SetlistPredictionStructure } from '@/modules/setlist/types';

export const ENRICH_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function isEnrichCooldownElapsed(
  enrichedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!enrichedAt) return true;
  const last = new Date(enrichedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= ENRICH_COOLDOWN_MS;
}

export function shouldRequestBackgroundEnrich(params: {
  isFutureShow: boolean;
  structure: SetlistPredictionStructure | null | undefined;
  enrichedAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (!params.isFutureShow) return false;
  if (!params.structure) return false;
  if (
    params.structure !== 'insufficient_data' &&
    params.structure !== 'no_tour_data_fallback'
  ) {
    return false;
  }
  return isEnrichCooldownElapsed(params.enrichedAt, params.now);
}
