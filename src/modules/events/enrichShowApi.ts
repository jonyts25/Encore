import { apiFetch } from '@/core/api/client';

export type EnrichShowStartResponse = {
  status: 'started' | 'running';
};

export async function requestShowEnrich(
  showId: string,
  accessToken: string
): Promise<EnrichShowStartResponse> {
  return apiFetch<EnrichShowStartResponse>(`/api/shows/${showId}/enrich`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
