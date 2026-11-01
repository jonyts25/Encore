import { apiFetch } from '@/core/api/client';

export type LinkSetlistToShowResponse = {
  show_id: string;
  songs_inserted: number;
};

export class LinkSetlistToShowError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_url' | 'not_found' | 'date_mismatch' | 'artist_mismatch' | 'unknown'
  ) {
    super(message);
    this.name = 'LinkSetlistToShowError';
  }
}

export async function linkSetlistUrlToShow(
  showId: string,
  url: string,
  accessToken: string
): Promise<LinkSetlistToShowResponse> {
  try {
    return await apiFetch<LinkSetlistToShowResponse>(`/api/shows/${showId}/link-setlistfm`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Link failed';
    if (message.includes('inválido') || message.includes('Invalid')) {
      throw new LinkSetlistToShowError(message, 'invalid_url');
    }
    if (message.includes('no encontrado') || message.includes('not found')) {
      throw new LinkSetlistToShowError(message, 'not_found');
    }
    if (message.includes('otra fecha') || message.includes('date')) {
      throw new LinkSetlistToShowError(message, 'date_mismatch');
    }
    if (message.includes('otro artista')) {
      throw new LinkSetlistToShowError(message, 'artist_mismatch');
    }
    throw new LinkSetlistToShowError(message, 'unknown');
  }
}
