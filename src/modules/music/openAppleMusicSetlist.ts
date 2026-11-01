import { fetchCommunityPlaylists } from '@/modules/communityPlaylists/api';

import { resolveAppleMusicArtistUrl } from './appleMusicItunes';

export async function resolveAppleMusicSetlistUrl(params: {
  artistName: string;
  artistId?: string | null;
  tourId?: string | null;
}): Promise<string> {
  const artistName = params.artistName.trim();
  if (!artistName) {
    throw new Error('Missing artist name');
  }

  if (params.artistId) {
    const playlists = await fetchCommunityPlaylists({
      artistId: params.artistId,
      tourId: params.tourId ?? null,
    });
    const applePlaylist = playlists.find((row) => row.service === 'apple_music');
    if (applePlaylist?.url) {
      return applePlaylist.url;
    }
  }

  return resolveAppleMusicArtistUrl(artistName);
}
