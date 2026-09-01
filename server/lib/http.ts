const JSON_UTF8_CONTENT_TYPE = 'application/json; charset=utf-8';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', JSON_UTF8_CONTENT_TYPE);

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function jsonOk<T>(body: T, init?: ResponseInit): Response {
  return jsonResponse(body, { ...init, status: init?.status ?? 200 });
}

export function jsonError(message: string, status: number, details?: unknown): Response {
  return jsonResponse(
    {
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status }
  );
}
