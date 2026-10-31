import type { MusicStreamingService } from '@/modules/music/streamingLinks';

export type CommunityPlaylistRecord = {
  id: string;
  tour_id: string | null;
  artist_id: string;
  url: string;
  service: MusicStreamingService;
  title: string | null;
  created_by: string;
  created_at: string;
  creator_display_name: string | null;
};

export type CommunityPlaylistRow = CommunityPlaylistRecord & {
  useCount: number;
};
