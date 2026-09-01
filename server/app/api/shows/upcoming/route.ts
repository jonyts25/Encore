import { jsonError, jsonOk } from '@/lib/http';
import { listUpcomingShows } from '@/lib/shows';

export async function GET() {
  try {
    const shows = await listUpcomingShows();
    return jsonOk({ shows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load upcoming shows';
    return jsonError(message, 500);
  }
}
