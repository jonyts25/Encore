import type { MusicStreamingService } from '@/modules/music/streamingLinks';

import type { CommunityPlaylistRow } from './types';

export function sortCommunityPlaylists(
  playlists: CommunityPlaylistRow[],
  preferredService: MusicStreamingService | null
): CommunityPlaylistRow[] {
  return [...playlists].sort((a, b) => {
    const aPreferred = preferredService != null && a.service === preferredService ? 0 : 1;
    const bPreferred = preferredService != null && b.service === preferredService ? 0 : 1;
    if (aPreferred !== bPreferred) return aPreferred - bPreferred;
    if (b.useCount !== a.useCount) return b.useCount - a.useCount;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function communityPlaylistScopeKey(tourId: string | null): string {
  return tourId ?? 'artist-only';
}
