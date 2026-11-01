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

export function isSetlistLinkCooldownElapsed(
  setlistCheckedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  return isEnrichCooldownElapsed(setlistCheckedAt, now);
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

export function shouldRequestPastShowSetlistLink(params: {
  isPastShow: boolean;
  showSongCount: number;
  setlistCheckedAt: string | null | undefined;
  now?: Date;
}): boolean {
  if (!params.isPastShow) return false;
  if (!isSetlistLinkCooldownElapsed(params.setlistCheckedAt, params.now)) return false;
  return params.showSongCount === 0;
}

export function shouldRequestSetlistLinkOnConfirm(params: {
  setlistCheckedAt: string | null | undefined;
  now?: Date;
}): boolean {
  return isSetlistLinkCooldownElapsed(params.setlistCheckedAt, params.now);
}
