import { apiFetch } from './client';

export type HealthResponse = {
  status: string;
};

export function checkHealth() {
  return apiFetch<HealthResponse>('/api/health');
}
