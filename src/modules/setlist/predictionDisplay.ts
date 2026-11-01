import type { PredictedSong, SetlistPrediction, SetlistPredictionStructure } from './types';

const CONFIDENCE_STRUCTURES: SetlistPredictionStructure[] = [
  'mostly_fixed',
  'rotating',
  'no_tour_data_fallback',
];

export function predictionShowsConfidence(structure: SetlistPredictionStructure): boolean {
  return CONFIDENCE_STRUCTURES.includes(structure);
}

export function sortPredictedSongsByPosition(songs: PredictedSong[]): PredictedSong[] {
  return [...songs].sort((a, b) => {
    const positionA = a.position ?? a.avg_position ?? Number.MAX_SAFE_INTEGER;
    const positionB = b.position ?? b.avg_position ?? Number.MAX_SAFE_INTEGER;
    return positionA - positionB;
  });
}

/** @deprecated Prefer sortPredictedSongsByPosition — server order is canonical. */
export function sortPredictedSongsByConfidence(songs: PredictedSong[]): PredictedSong[] {
  return [...songs].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
}

/** @deprecated Prefer sortPredictedSongsByPosition — server order is canonical. */
export function sortPredictedSongsBySetlistOrder(songs: PredictedSong[]): PredictedSong[] {
  return sortPredictedSongsByPosition(songs);
}

export function sortPredictedSongsForDisplay(prediction: SetlistPrediction): PredictedSong[] {
  return sortPredictedSongsByPosition(prediction.songs);
}

export function predictedSongConfidencePct(song: PredictedSong): number | null {
  if (song.frequency_pct != null) return Math.round(song.frequency_pct);
  if (song.confidence != null) return Math.round(song.confidence * 100);
  return null;
}

function formatReferenceDate(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  const tag = locale.startsWith('en') ? 'en-US' : 'es-MX';
  return new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatReferenceDates(dates: string[], locale: string): string {
  return dates.map((date) => formatReferenceDate(date, locale)).join(', ');
}

export function getPredictionDisclaimerKey(
  structure: SetlistPredictionStructure
): string | null {
  if (structure === 'single_show_reference') return 'setlist.referenceSingleShow';
  if (structure === 'limited_tour_data') return 'setlist.referenceLimitedTour';
  if (structure === 'no_tour_data_fallback') return 'setlist.fallbackNoTour';
  return null;
}

export function getPredictionDisclaimerParams(
  prediction: SetlistPrediction,
  locale: string
): Record<string, string> | undefined {
  const dates = prediction.reference_show_dates ?? [];
  if (prediction.structure === 'single_show_reference' && dates[0]) {
    return { date: formatReferenceDate(dates[0], locale) };
  }
  if (prediction.structure === 'limited_tour_data' && dates.length > 0) {
    return { dates: formatReferenceDates(dates, locale) };
  }
  return undefined;
}
