const inFlightByShowId = new Map<string, Promise<void>>();

export function getShowPackPrefetchInFlight(showId: string): Promise<void> | undefined {
  return inFlightByShowId.get(showId);
}

export async function withShowPackPrefetchLock(
  showId: string,
  task: () => Promise<void>
): Promise<void> {
  const existing = inFlightByShowId.get(showId);
  if (existing) {
    await existing;
    return;
  }

  const promise = task().finally(() => {
    if (inFlightByShowId.get(showId) === promise) {
      inFlightByShowId.delete(showId);
    }
  });

  inFlightByShowId.set(showId, promise);
  await promise;
}

export function __resetShowPackPrefetchLocksForTests(): void {
  inFlightByShowId.clear();
}
