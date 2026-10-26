export type UserSongPayload = {
  id: string;
  artist_id: string;
  title: string;
  source: string;
};

export type ParsedAddUserSongResult =
  | { ok: true; song: UserSongPayload; created: boolean }
  | { ok: false; reason: 'not_authenticated' | 'invalid_input' | 'daily_limit' | 'unknown'; createdToday?: number; limit?: number };

export function parseAddUserSongResponse(payload: {
  result?: string;
  song?: UserSongPayload;
  created_today?: number;
  limit?: number;
}): ParsedAddUserSongResult {
  const result = payload.result ?? 'unknown';
  if (result === 'created') {
    if (!payload.song?.id) return { ok: false, reason: 'unknown' };
    return { ok: true, song: payload.song, created: true };
  }
  if (result === 'existing') {
    if (!payload.song?.id) return { ok: false, reason: 'unknown' };
    return { ok: true, song: payload.song, created: false };
  }
  if (result === 'daily_limit') {
    return {
      ok: false,
      reason: 'daily_limit',
      createdToday: payload.created_today,
      limit: payload.limit,
    };
  }
  return { ok: false, reason: 'unknown' };
}

export function mapAddUserSongRpcError(message: string, code?: string): ParsedAddUserSongResult {
  const upper = message.toUpperCase();
  if (code === '42501' || upper.includes('NOT_AUTHENTICATED')) {
    return { ok: false, reason: 'not_authenticated' };
  }
  if (code === '22023' || upper.includes('INVALID_INPUT')) {
    return { ok: false, reason: 'invalid_input' };
  }
  return { ok: false, reason: 'unknown' };
}
