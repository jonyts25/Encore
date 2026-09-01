import { jsonError } from './http';

export function requireAdminRequest(request: Request): Response | null {
  const configured = process.env.ADMIN_API_KEY?.trim();
  if (!configured) {
    return null;
  }

  const header = request.headers.get('authorization');
  if (header === `Bearer ${configured}`) {
    return null;
  }

  const apiKey = request.headers.get('x-admin-api-key');
  if (apiKey === configured) {
    return null;
  }

  return jsonError('Unauthorized admin request', 401);
}
