const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

export class SonglinkRateLimiter {
  private readonly recentTimestamps: number[] = [];

  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    this.recentTimestamps.push(Date.now());
    return task();
  }

  private async waitForSlot(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const now = Date.now();
      this.prune(now);
      if (this.recentTimestamps.length < MAX_REQUESTS_PER_WINDOW) {
        return;
      }
      const oldest = this.recentTimestamps[0] ?? now;
      const waitMs = WINDOW_MS - (now - oldest) + 25;
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 25)));
    }
  }

  private prune(now: number): void {
    while (this.recentTimestamps.length > 0 && now - this.recentTimestamps[0]! >= WINDOW_MS) {
      this.recentTimestamps.shift();
    }
  }
}

export const songlinkRateLimiter = new SonglinkRateLimiter();
