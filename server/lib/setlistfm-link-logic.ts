import { parseSetlistFmEventDate } from './providers/setlistfm';
import type { SetlistFmSetlist } from './providers/setlistfm/types';

/** setlist.fm ids are hex before `.html` (slug suffix or final path segment). */
const SETLIST_FM_ID_SUFFIX_RE = /(?:-|\/)((?:[0-9a-f]{8,}))\.html(?:\?.*)?$/i;

export const SETLIST_VENUE_MAX_DISTANCE_KM = 50;

export function parseSetlistFmSetlistIdFromUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes('setlist.fm') || trimmed.includes('/setlist/')) {
    const suffix = trimmed.match(SETLIST_FM_ID_SUFFIX_RE);
    if (suffix?.[1]) return suffix[1].toLowerCase();
    return null;
  }

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
  leon: 'leon',
  'león': 'leon',
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

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function filterSetlistsByExactEventDate(
  setlists: SetlistFmSetlist[],
  requestedDateDdMmYyyy: string
): SetlistFmSetlist[] {
  const target = requestedDateDdMmYyyy.trim();
  return setlists.filter((item) => item.eventDate.trim() === target);
}

export function setlistMatchesRequestedShowDate(
  setlist: SetlistFmSetlist,
  requestedDateDdMmYyyy: string
): boolean {
  return setlist.eventDate.trim() === requestedDateDdMmYyyy.trim();
}

export function venueMatchesForSetlistLink(
  setlist: SetlistFmSetlist,
  venueHint: ShowVenueHint,
  maxDistanceKm = SETLIST_VENUE_MAX_DISTANCE_KM
): boolean {
  const targetCity = venueHint.city ? normalizePlaceName(venueHint.city) : null;
  const setlistCity = normalizePlaceName(setlist.venue.city.name);
  if (targetCity && setlistCity === targetCity) {
    return true;
  }

  const hasUserCoords =
    venueHint.lat != null &&
    venueHint.lng != null &&
    Number.isFinite(venueHint.lat) &&
    Number.isFinite(venueHint.lng);

  const setlistCoords = setlist.venue.city.coords;
  if (hasUserCoords && setlistCoords) {
    const distance = haversineKm(
      venueHint.lat!,
      venueHint.lng!,
      setlistCoords.lat,
      setlistCoords.long
    );
    return distance <= maxDistanceKm;
  }

  return false;
}

export function pickBestMatchingSetlist(
  setlists: SetlistFmSetlist[],
  requestedDateDdMmYyyy: string,
  venueHint: ShowVenueHint
): SetlistFmSetlist | null {
  const sameDay = filterSetlistsByExactEventDate(setlists, requestedDateDdMmYyyy);
  if (sameDay.length === 0) return null;

  const venueMatches = sameDay.filter((item) => venueMatchesForSetlistLink(item, venueHint));
  if (venueMatches.length === 0) return null;
  if (venueMatches.length === 1) return venueMatches[0] ?? null;

  const hasCoords =
    venueHint.lat != null &&
    venueHint.lng != null &&
    Number.isFinite(venueHint.lat) &&
    Number.isFinite(venueHint.lng);

  if (!hasCoords) {
    return venueMatches[0] ?? null;
  }

  let best = venueMatches[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const setlist of venueMatches) {
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

export function resolveRequestedSetlistDate(
  localDate: string | null,
  showDateIso: string
): string | null {
  return (
    (localDate && showLocalDateToSetlistFmDate(localDate)) ||
    isoShowDateToSetlistFmDate(showDateIso)
  );
}

export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function setlistArtistMatchesShow(
  setlist: SetlistFmSetlist,
  artistMbid: string | null,
  artistName: string
): boolean {
  const setlistMbid = setlist.artist.mbid?.trim().toLowerCase();
  const targetMbid = artistMbid?.trim().toLowerCase();
  if (setlistMbid && targetMbid && setlistMbid === targetMbid) {
    return true;
  }
  return normalizeArtistName(setlist.artist.name) === normalizeArtistName(artistName);
}
