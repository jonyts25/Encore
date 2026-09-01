const DEFAULT_API_URL = 'https://encore-api-production-5b9a.up.railway.app';

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configured && configured.length > 0 ? configured.replace(/\/$/, '') : DEFAULT_API_URL;
}
