import { apiFetch, ApiError } from '@/core/api/client';

import type { SetlistPrediction } from './types';

type PredictionResponse = {
  prediction: SetlistPrediction;
};

export async function fetchShowPrediction(showId: string): Promise<SetlistPrediction | null> {
  try {
    const data = await apiFetch<PredictionResponse>(`/api/shows/${showId}/prediction`);
    return data.prediction;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
