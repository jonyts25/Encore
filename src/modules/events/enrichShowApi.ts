import { apiFetch } from '@/core/api/client';
import type { SetlistPrediction } from '@/modules/setlist/types';

export type EnrichShowResponse = {
  status: 'completed' | 'skipped_cooldown' | 'skipped_not_active';
  show_id: string;
  enriched_at: string | null;
  assigned_tour: boolean;
  setlists_processed: number;
  prediction: SetlistPrediction | null;
};

export async function requestShowEnrich(showId: string): Promise<EnrichShowResponse> {
  return apiFetch<EnrichShowResponse>(`/api/shows/${showId}/enrich`, {
    method: 'POST',
  });
}
