export const queryKeys = {
  home: (userId: string) => ['home', userId] as const,
  artistShows: (artistId: string, userId: string | null) =>
    ['artistShows', artistId, userId ?? 'guest'] as const,
  upcoming: (followedOnly: boolean, userId: string | null) =>
    ['upcoming', followedOnly ? 'followed' : 'all', userId ?? 'guest'] as const,
  showStatus: (showId: string, userId: string) => ['showStatus', showId, userId] as const,
  prediction: (showId: string) => ['prediction', showId] as const,
  lyrics: (artist: string, title: string) =>
    ['lyrics', artist.trim().toLowerCase(), title.trim().toLowerCase()] as const,
  lyricsSearchMatches: (artist: string, titleQuery: string) =>
    ['lyricsSearchMatches', artist.trim().toLowerCase(), titleQuery.trim().toLowerCase()] as const,
  show: (showId: string) => ['show', showId] as const,
  artistSongs: (artistId: string) => ['artistSongs', artistId] as const,
  explorePopular: () => ['explore', 'popular-artists'] as const,
};
