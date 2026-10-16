import type { AuthError } from '@supabase/supabase-js';

function errorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return String((error as { message?: string }).message ?? '');
}

function errorName(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return String((error as { name?: string }).name ?? '');
}

export function isAuthNetworkError(error: unknown): boolean {
  const name = errorName(error);
  if (name === 'AuthRetryableFetchError') return true;

  const message = errorMessage(error).toLowerCase();
  return (
    message.includes('fetch failed') ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('network error')
  );
}

export function isSessionInvalidError(error: unknown): boolean {
  if (isAuthNetworkError(error)) return false;

  const authError = error as AuthError | undefined;
  const message = errorMessage(error).toLowerCase();
  const code = authError?.code?.toLowerCase() ?? '';

  return (
    code === 'refresh_token_not_found' ||
    code === 'invalid_refresh_token' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('session not found') ||
    message.includes('jwt expired') ||
    message.includes('invalid jwt')
  );
}
