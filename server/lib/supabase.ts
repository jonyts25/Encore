import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv('SUPABASE_URL');
}

export function getSupabasePublishableKey(): string {
  return requireEnv('SUPABASE_PUBLISHABLE_KEY');
}

export function createSupabaseClient(accessToken?: string): SupabaseClient {
  const options = accessToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    : undefined;

  return createClient(getSupabaseUrl(), getSupabasePublishableKey(), options);
}
