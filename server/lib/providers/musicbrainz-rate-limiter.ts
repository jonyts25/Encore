const MIN_INTERVAL_MS = 1000;

let lastRequestAt = 0;

export async function acquireMusicBrainzRequestSlot(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
  if (waitMs > 0) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, waitMs);
    });
  }
  lastRequestAt = Date.now();
}
