export type CreateUserShowRpcPayload = {
  result: string;
  show_id?: string;
  show?: Record<string, unknown>;
  candidates?: VenueCandidatePayload[];
  created_today?: number;
  limit?: number;
};

export type VenueCandidatePayload = {
  id: string;
  name: string;
  city: string;
  country: string;
  score?: number;
};

export type ParsedCreateUserShowResult =
  | { kind: 'created'; showId: string }
  | { kind: 'existing'; showId: string }
  | { kind: 'venue_candidates'; candidates: VenueCandidatePayload[] }
  | { kind: 'daily_limit'; createdToday: number; limit: number }
  | { kind: 'unknown'; raw: CreateUserShowRpcPayload };

export function showDedupeKey(artistId: string, venueId: string, localDate: string): string {
  return `${artistId}:${venueId}:${localDate}`;
}

export function isDuplicateShowKey(
  artistId: string,
  venueId: string,
  localDate: string,
  existing: { artistId: string; venueId: string; localDate: string }
): boolean {
  return showDedupeKey(artistId, venueId, localDate) === showDedupeKey(
    existing.artistId,
    existing.venueId,
    existing.localDate
  );
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseLocalDateInput(input: string): { ok: true; value: string } | { ok: false } {
  const trimmed = input.trim();
  if (!ISO_DATE.test(trimmed)) return { ok: false };
  const [y, m, d] = trimmed.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return { ok: false };
  }
  return { ok: true, value: trimmed };
}

const TIME_HM = /^(\d{1,2}):(\d{2})$/;

export function parseLocalTimeInput(
  input: string
): { ok: true; value: string; confirmed: boolean } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, value: '20:00:00', confirmed: false };
  }
  const match = TIME_HM.exec(trimmed);
  if (!match) return { ok: false };
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return { ok: false };
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return { ok: true, value: `${hh}:${mm}:00`, confirmed: true };
}

export function parseCreateUserShowResponse(
  payload: CreateUserShowRpcPayload
): ParsedCreateUserShowResult {
  switch (payload.result) {
    case 'created':
      if (payload.show_id) return { kind: 'created', showId: payload.show_id };
      break;
    case 'existing':
      if (payload.show_id) return { kind: 'existing', showId: payload.show_id };
      break;
    case 'venue_candidates':
      return {
        kind: 'venue_candidates',
        candidates: payload.candidates ?? [],
      };
    case 'daily_limit':
      return {
        kind: 'daily_limit',
        createdToday: payload.created_today ?? 0,
        limit: payload.limit ?? 5,
      };
    default:
      break;
  }
  return { kind: 'unknown', raw: payload };
}
