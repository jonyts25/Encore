import type { SupabaseClient, User } from '@supabase/supabase-js';

import { createSupabaseClient } from './supabase';

export type AuthenticatedContext = {
  user: User;
  supabase: SupabaseClient;
  accessToken: string;
};

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

export async function requireAuthenticatedUser(
  request: Request
): Promise<AuthenticatedContext | null> {
  const accessToken = getBearerToken(request);
  if (!accessToken) return null;

  const supabase = createSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) return null;

  return {
    user: data.user,
    supabase,
    accessToken,
  };
}
