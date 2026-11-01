import { jsonError, jsonOk } from '@/lib/http';
import { getShowPrediction } from '@/lib/setlist-prediction';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const sampleParam = url.searchParams.get('sampleSize');
  const sampleSize =
    sampleParam && Number.isFinite(Number(sampleParam)) ? Number(sampleParam) : undefined;

  try {
    const prediction = await getShowPrediction(id, sampleSize);
    if (!prediction) {
      return jsonError('Show not found', 404);
    }
    return jsonOk({ prediction });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate prediction';
    return jsonError(message, 500, error);
  }
}
