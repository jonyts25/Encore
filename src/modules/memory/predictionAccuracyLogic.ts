export type PredictionAccuracy = {
  hits: number;
  total: number;
};

/** Count predicted songs that appear in the user-confirmed setlist. */
export function computePredictionAccuracy(
  predictedSongIds: string[],
  confirmedSongIds: string[]
): PredictionAccuracy {
  const confirmed = new Set(confirmedSongIds);
  let hits = 0;
  for (const songId of predictedSongIds) {
    if (confirmed.has(songId)) hits += 1;
  }
  return { hits, total: predictedSongIds.length };
}
