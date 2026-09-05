import * as Linking from 'expo-linking';

import { supabase } from '@/core/api/supabase';

export const AUTH_CALLBACK_PATH = 'auth-callback';

export function buildAuthCallbackUrl(): string {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}

function extractAuthParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    return new URLSearchParams(url.slice(hashIndex + 1));
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    return new URLSearchParams(url.slice(queryIndex + 1));
  }

  return new URLSearchParams();
}

export function isAuthCallbackUrl(url: string): boolean {
  const parsed = Linking.parse(url);
  const path = parsed.path?.replace(/^\//, '') ?? '';
  return path === AUTH_CALLBACK_PATH || url.includes(`${AUTH_CALLBACK_PATH}`);
}

export async function completeAuthFromUrl(url: string): Promise<boolean> {
  if (!isAuthCallbackUrl(url)) return false;

  const params = extractAuthParams(url);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

  if (!access_token || !refresh_token) return false;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return !error;
}
