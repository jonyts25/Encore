export type SonglinkPlatformLinks = {
  youtubeMusic: string | null;
  spotify: string | null;
  youtube: string | null;
};

type SonglinkApiResponse = {
  linksByPlatform?: Record<
    string,
    {
      url?: string;
    }
  >;
};

export function parseSonglinkResponse(payload: SonglinkApiResponse): SonglinkPlatformLinks {
  const byPlatform = payload.linksByPlatform ?? {};
  return {
    youtubeMusic: byPlatform.youtubeMusic?.url ?? null,
    spotify: byPlatform.spotify?.url ?? null,
    youtube: byPlatform.youtube?.url ?? null,
  };
}
