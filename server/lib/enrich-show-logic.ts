import { parseSetlistFmEventDate } from './providers/setlistfm';

export const ENRICH_COOLDOWN_MS = 12 * 60 * 60 * 1000;
export const ENRICH_LOOKBACK_MONTHS = 18;
export const ENRICH_TOUR_ACTIVITY_MONTHS = 6;

export type SetlistTourCandidate = {
  setlistId: string;
  eventDate: string;
  tourName: string | null;
  hasSongs: boolean;
};

export function normalizeTourName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function shouldRunEnrich(enrichedAt: string | null | undefined, now: Date): boolean {
  if (!enrichedAt) return true;
  const last = new Date(enrichedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= ENRICH_COOLDOWN_MS;
}

export function monthsAgo(months: number, now: Date): Date {
  const copy = new Date(now.getTime());
  copy.setUTCMonth(copy.getUTCMonth() - months);
  return copy;
}

export function isSetlistWithinMonths(eventDate: string, months: number, now: Date): boolean {
  try {
    const showTime = new Date(parseSetlistFmEventDate(eventDate)).getTime();
    return showTime >= monthsAgo(months, now).getTime();
  } catch {
    return false;
  }
}

export function filterRecentSetlistsWithSongs(
  candidates: SetlistTourCandidate[],
  months: number,
  now: Date
): SetlistTourCandidate[] {
  return candidates.filter(
    (item) => item.hasSongs && isSetlistWithinMonths(item.eventDate, months, now)
  );
}

/** Most recent setlist (by event date) that includes a tour name wins. */
export function detectCurrentTourName(candidates: SetlistTourCandidate[]): string | null {
  const sorted = [...candidates].sort(
    (a, b) =>
      new Date(parseSetlistFmEventDate(b.eventDate)).getTime() -
      new Date(parseSetlistFmEventDate(a.eventDate)).getTime()
  );

  for (const item of sorted) {
    const name = item.tourName?.trim();
    if (name) return name;
  }
  return null;
}

export function tourHasRecentSetlists(
  candidates: SetlistTourCandidate[],
  tourName: string,
  months: number,
  now: Date
): boolean {
  const normalized = normalizeTourName(tourName);
  return candidates.some((item) => {
    if (!item.tourName?.trim()) return false;
    if (normalizeTourName(item.tourName) !== normalized) return false;
    return item.hasSongs && isSetlistWithinMonths(item.eventDate, months, now);
  });
}

export function shouldAssignTourToShow(params: {
  existingTourId: string | null;
  currentTourName: string | null;
  candidates: SetlistTourCandidate[];
  now: Date;
}): boolean {
  if (params.existingTourId) return false;
  if (!params.currentTourName) return false;
  return tourHasRecentSetlists(
    params.candidates,
    params.currentTourName,
    ENRICH_TOUR_ACTIVITY_MONTHS,
    params.now
  );
}

export function shouldShowNewTourEnrichmentNotice(params: {
  assignedTourThisRun: boolean;
  structure: string;
}): boolean {
  if (params.structure === 'no_tour_data_fallback') return true;
  if (!params.assignedTourThisRun) return false;
  return (
    params.structure === 'single_show_reference' ||
    params.structure === 'limited_tour_data' ||
    params.structure === 'insufficient_data'
  );
}
