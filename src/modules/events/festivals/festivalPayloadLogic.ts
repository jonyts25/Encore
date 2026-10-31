import type {
  FestivalImportPayload,
  FestivalLineupEntryPayload,
  FestivalValidationSummary,
} from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseFestivalImportJson(raw: string): FestivalImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('invalid_json');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid_shape');
  }
  return normalizeFestivalPayload(parsed as Partial<FestivalImportPayload>);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`missing_${field}`);
  }
  return value.trim();
}

function normalizeLineupEntry(entry: unknown, index: number): FestivalLineupEntryPayload {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`invalid_lineup_${index}`);
  }
  const row = entry as Partial<FestivalLineupEntryPayload>;
  const artist = requireString(row.artist, `lineup_${index}_artist`);
  const day = requireString(row.day, `lineup_${index}_day`);
  if (!DATE_RE.test(day)) {
    throw new Error(`invalid_lineup_${index}_day`);
  }
  const start = row.start == null || row.start === '' ? null : String(row.start).trim();
  const end = row.end == null || row.end === '' ? null : String(row.end).trim();
  if (start && !TIME_RE.test(start)) throw new Error(`invalid_lineup_${index}_start`);
  if (end && !TIME_RE.test(end)) throw new Error(`invalid_lineup_${index}_end`);
  const stage =
    row.stage == null || row.stage === '' ? null : String(row.stage).trim();
  return { artist, day, stage, start, end };
}

export function normalizeFestivalPayload(input: Partial<FestivalImportPayload>): FestivalImportPayload {
  const name = requireString(input.name, 'name');
  const edition_year = input.edition_year;
  if (typeof edition_year !== 'number' || !Number.isInteger(edition_year)) {
    throw new Error('invalid_edition_year');
  }
  const start_date = requireString(input.start_date, 'start_date');
  const end_date = requireString(input.end_date, 'end_date');
  if (!DATE_RE.test(start_date) || !DATE_RE.test(end_date)) {
    throw new Error('invalid_dates');
  }
  if (start_date > end_date) {
    throw new Error('invalid_date_range');
  }
  if (!input.venue || typeof input.venue !== 'object') {
    throw new Error('missing_venue');
  }
  const venueName = requireString(input.venue.name, 'venue_name');
  const venueCity = requireString(input.venue.city, 'venue_city');
  const lineupRaw = input.lineup;
  if (!Array.isArray(lineupRaw) || lineupRaw.length === 0) {
    throw new Error('missing_lineup');
  }
  const lineup = lineupRaw.map((entry, index) => normalizeLineupEntry(entry, index));
  return {
    name,
    edition_year,
    venue: {
      name: venueName,
      city: venueCity,
      country: input.venue.country?.trim() || undefined,
      timezone: input.venue.timezone?.trim() || undefined,
    },
    start_date,
    end_date,
    lineup,
  };
}

export function uniqueArtistNames(payload: FestivalImportPayload): string[] {
  const names = new Set<string>();
  for (const entry of payload.lineup) {
    names.add(entry.artist.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export function festivalDayKeys(payload: FestivalImportPayload): string[] {
  const days = new Set<string>();
  for (const entry of payload.lineup) {
    days.add(entry.day);
  }
  days.add(payload.start_date);
  days.add(payload.end_date);
  return [...days].sort();
}

export function buildFestivalValidationSummary(
  payload: FestivalImportPayload,
  catalogMatches: Record<string, boolean>
): FestivalValidationSummary {
  const uniqueArtists = uniqueArtistNames(payload);
  const foundArtists: string[] = [];
  const missingArtists: string[] = [];
  for (const artist of uniqueArtists) {
    if (catalogMatches[artist]) {
      foundArtists.push(artist);
    } else {
      missingArtists.push(artist);
    }
  }
  return {
    payload,
    dayCount: festivalDayKeys(payload).length,
    lineupCount: payload.lineup.length,
    uniqueArtists,
    foundArtists,
    missingArtists,
  };
}

export function payloadToRpcJson(payload: FestivalImportPayload): FestivalImportPayload {
  return normalizeFestivalPayload(payload);
}
