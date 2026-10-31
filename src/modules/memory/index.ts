export { fetchDiscographyPayload } from './discographyApi';
export {
  computeDiscographyStats,
  filterDiscographyEntriesByYear,
  groupDiscographyByMonth,
  listDiscographyYears,
} from './discographyLogic';
export { DiscographyScreenContent } from './components/DiscographyScreenContent';
export { useDiscography } from './hooks/useDiscography';
export { getMemoryForShow, listMemoriesForYear, persistShowMemory, flushPendingMemories } from './memoryApi';
export type { MemorySavePayload, ShowMemory, SetlistDraftItem } from './types';
export { computePredictionAccuracy } from './predictionAccuracyLogic';
export {
  buildSetlistDraftFromPrediction,
  buildSetlistDraftFromShowSongs,
  draftToMemorySongs,
  moveSetlistItem,
  resolveSetlistPrefill,
  toggleHighlight,
} from './setlistPrefillLogic';
export type {
  DiscographyMonthGroup,
  DiscographyPayload,
  DiscographyShowEntry,
  DiscographyStats,
  DiscographyYearFilter,
  ShowMemorySummary,
} from './types';
