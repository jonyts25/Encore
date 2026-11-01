import { enrichShow } from './enrich-show';

const runningShowIds = new Set<string>();

export function isEnrichRunning(showId: string): boolean {
  return runningShowIds.has(showId);
}

export type EnrichStartSlot = 'started' | 'running';

/** Runs enrichShow in the background; at most one run per show id in this process. */
export function startEnrichShowInBackground(showId: string): EnrichStartSlot {
  if (runningShowIds.has(showId)) {
    return 'running';
  }

  runningShowIds.add(showId);
  void enrichShow(showId)
    .catch((error) => {
      console.error('[enrichShow] background run failed', showId, error);
    })
    .finally(() => {
      runningShowIds.delete(showId);
    });

  return 'started';
}
