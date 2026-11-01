export type SongAggregate = {
  normalizedKey: string;
  titleCounts: Map<string, number>;
  songIdCounts: Map<string, number>;
  appearances: Array<{
    showId: string;
    showDate: string;
    position: number;
    isEncore: boolean;
  }>;
};
