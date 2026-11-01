import { parseSetlistFmEventDate } from './providers/setlistfm';
import type { SetlistFmSetlist } from './providers/setlistfm/types';

const SETLIST_FM_URL_RE =
  /^https?:\/\/(?:www\.)?setlist\.fm\/setlist\/[^/]+\/([0-9a-f]{8,})\.html(?:\?.*)?$/i;

const SETLIST_FM_PATH_RE = /\/setlist\/[^/]+\/([0-9a-f]{8,})\.html(?:\?.*)?$/i;

export function parseSetlistFmSetlistIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = trimmed.match(SETLIST_FM_URL_RE);
  if (direct?.[1]) return direct[1].toLowerCase();

  const pathMatch = trimmed.match(SETLIST_FM_PATH_RE);
  if (pathMatch?.[1]) return pathMatch[1].toLowerCase();

  if (/^[0-9a-f]{8,}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

export function showLocalDateToSetlistFmDate(localDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

export function isoShowDateToSetlistFmDate(isoDate: string): string | null {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

const CITY_ALIASES: Record<string, string> = {
  'mexico city': 'ciudad de mexico',
  'ciudad de mexico': 'ciudad de mexico',
  'ciudad de méxico': 'ciudad de mexico',
};

export function normalizePlaceName(value: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return CITY_ALIASES[normalized] ?? normalized;
}

export type ShowVenueHint = {
  city: string | null;
  lat: number | null;
  lng: number | null;
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pickBestMatchingSetlist(
  setlists: SetlistFmSetlist[],
  venueHint: ShowVenueHint
): SetlistFmSetlist | null {
  if (setlists.length === 0) return null;
  if (setlists.length === 1) return setlists[0] ?? null;

  const targetCity = venueHint.city ? normalizePlaceName(venueHint.city) : null;
  const cityMatches = targetCity
    ? setlists.filter(
        (item) => normalizePlaceName(item.venue.city.name) === targetCity
      )
    : [];

  const pool = cityMatches.length > 0 ? cityMatches : setlists;

  if (pool.length === 1) return pool[0] ?? null;

  const hasCoords =
    venueHint.lat != null &&
    venueHint.lng != null &&
    Number.isFinite(venueHint.lat) &&
    Number.isFinite(venueHint.lng);

  if (!hasCoords) {
    return pool[0] ?? null;
  }

  let best = pool[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const setlist of pool) {
    const coords = setlist.venue.city.coords;
    if (!coords) continue;
    const distance = haversineKm(venueHint.lat!, venueHint.lng!, coords.lat, coords.long);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = setlist;
    }
  }

  return best;
}

export function setlistEventDateKey(eventDate: string): string {
  return parseSetlistFmEventDate(eventDate);
}

export const SETLIST_LINK_COOLDOWN_MS = 12 * 60 * 60 * 1000;

export function shouldRunSetlistLink(
  setlistCheckedAt: string | null | undefined,
  now: Date
): boolean {
  if (!setlistCheckedAt) return true;
  const last = new Date(setlistCheckedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= SETLIST_LINK_COOLDOWN_MS;
}
