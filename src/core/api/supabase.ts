import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';

function requireEnv(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Copy .env.example to .env and set your Supabase credentials.`);
  }
  return value;
}

const supabaseUrl = requireEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabasePublishableKey = requireEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
