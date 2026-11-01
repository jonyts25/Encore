import { apiFetch } from '@/core/api/client';

export type SetlistFmImportResponse = {
  show_id: string;
};

export class SetlistFmImportError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_url' | 'not_found' | 'unknown'
  ) {
    super(message);
    this.name = 'SetlistFmImportError';
  }
}

export async function importSetlistFromUrl(
  url: string,
  accessToken: string
): Promise<SetlistFmImportResponse> {
  try {
    return await apiFetch<SetlistFmImportResponse>('/api/setlistfm/import', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed';
    if (message.includes('inválido') || message.includes('Invalid')) {
      throw new SetlistFmImportError(message, 'invalid_url');
    }
    if (message.includes('no encontrado') || message.includes('not found')) {
      throw new SetlistFmImportError(message, 'not_found');
    }
    throw new SetlistFmImportError(message, 'unknown');
  }
}
