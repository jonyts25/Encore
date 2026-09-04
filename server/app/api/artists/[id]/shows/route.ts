import { jsonError, jsonOk } from '@/lib/http';
import { getArtistShowSections } from '@/lib/shows';
import { requireAuthenticatedUser } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: artistId } = await context.params;
    const auth = await requireAuthenticatedUser(request);

    const sections = await getArtistShowSections({
      artistId,
      userId: auth?.user.id ?? null,
      supabase: auth?.supabase,
    });

    return jsonOk({
      yours: sections.yours,
      other: sections.other,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load artist shows';
    return jsonError(message, 500);
  }
}
