import type { LyricsResult, SyncedLine } from './types';
import { medleyPartTitles } from './medleyParts';
import { detectScrollMode, normalizeDurationSeconds } from './scrollLogic';

export function combineMedleyLyricsResults(
  fullTitle: string,
  partTitles: readonly string[],
  parts: readonly LyricsResult[]
): LyricsResult {
  const plainSections: string[] = [];
  const syncedLines: SyncedLine[] = [];
  let timeOffset = 0;
  let totalDuration = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const partTitle = partTitles[index] ?? parts[index].title;
    const part = parts[index];

    if (index > 0) {
      const separator = `— ${partTitle} —`;
      plainSections.push(separator);
      syncedLines.push({ timestamp_seconds: timeOffset, line: separator });
    } else if (parts.length > 1) {
      const separator = `— ${partTitle} —`;
      plainSections.push(separator);
      syncedLines.push({ timestamp_seconds: timeOffset, line: separator });
    }

    plainSections.push(part.plainLyrics);
    for (const line of part.syncedLines) {
      syncedLines.push({
        timestamp_seconds: timeOffset + line.timestamp_seconds,
        line: line.line,
      });
    }

    const partDuration =
      normalizeDurationSeconds(part.durationSeconds) ??
      part.syncedLines[part.syncedLines.length - 1]?.timestamp_seconds ??
      0;
    totalDuration += partDuration + (index < parts.length - 1 ? 1 : 0);
    timeOffset += partDuration + 1;
  }

  const plainLyrics = plainSections.join('\n\n');
  const durationSeconds = totalDuration > 0 ? totalDuration : null;

  return {
    id: parts.map((part) => part.id).join('+'),
    title: fullTitle,
    artist: parts[0]?.artist ?? '',
    album: parts[0]?.album ?? null,
    plainLyrics,
    instrumental: parts.every((part) => part.instrumental),
    attribution: parts[0]?.attribution ?? '',
    durationSeconds,
    syncedLines,
    scrollMode: detectScrollMode(syncedLines, durationSeconds),
  };
}

export async function fetchLyricsForMedleySong(
  artist: string,
  title: string,
  fetchPart: (partTitle: string) => Promise<LyricsResult | null>,
  isMedley?: boolean
): Promise<LyricsResult | null> {
  const partTitles = medleyPartTitles(title, isMedley);
  if (partTitles.length === 1) {
    return fetchPart(partTitles[0]!);
  }

  const results: LyricsResult[] = [];
  for (const partTitle of partTitles) {
    const part = await fetchPart(partTitle);
    if (!part) return null;
    results.push(part);
  }

  return combineMedleyLyricsResults(title, partTitles, results);
}
