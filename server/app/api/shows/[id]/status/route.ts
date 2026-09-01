import { jsonError, jsonOk } from '@/lib/http';
import { requireAuthenticatedUser } from '@/lib/auth';
import { getShowById, upsertUserShowStatus } from '@/lib/shows';
import { SHOW_STATUSES, type ShowStatus } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type StatusBody = {
  status?: unknown;
  ticket_ref?: unknown;
};

function parseStatus(value: unknown): ShowStatus | null {
  if (typeof value !== 'string') return null;
  return SHOW_STATUSES.includes(value as ShowStatus) ? (value as ShowStatus) : null;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAuthenticatedUser(request);
  if (!auth) {
    return jsonError('Unauthorized', 401);
  }

  const { id: showId } = await context.params;

  let body: StatusBody;
  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const status = parseStatus(body.status);
  if (!status) {
    return jsonError('Invalid status. Expected interesado, voy, or fui', 400);
  }

  const ticketRef =
    body.ticket_ref === undefined || body.ticket_ref === null
      ? null
      : typeof body.ticket_ref === 'string'
        ? body.ticket_ref
        : null;

  if (body.ticket_ref !== undefined && body.ticket_ref !== null && typeof body.ticket_ref !== 'string') {
    return jsonError('ticket_ref must be a string or null', 400);
  }

  try {
    const show = await getShowById(showId);
    if (!show) {
      return jsonError('Show not found', 404);
    }

    const userShow = await upsertUserShowStatus({
      supabase: auth.supabase,
      userId: auth.user.id,
      showId,
      status,
      ticketRef,
    });

    return jsonOk({ user_show: userShow });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update show status';
    return jsonError(message, 500);
  }
}
