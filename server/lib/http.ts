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

function logServerError(status: number, message: string, cause?: unknown): void {
  if (cause instanceof Error) {
    console.error(`[API ${status}] ${message}`, cause.stack ?? cause.message);
    return;
  }

  if (cause !== undefined) {
    console.error(`[API ${status}] ${message}`, cause);
    return;
  }

  console.error(`[API ${status}] ${message}`);
}

export function jsonError(message: string, status: number, details?: unknown): Response {
  if (status >= 500) {
    logServerError(status, message, details);
  }

  const responseDetails = details instanceof Error ? undefined : details;

  return jsonResponse(
    {
      error: message,
      ...(responseDetails !== undefined ? { details: responseDetails } : {}),
    },
    { status }
  );
}
