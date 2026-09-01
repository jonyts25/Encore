type RateLimiterOptions = {
  perSecond: number;
  perDay: number;
};

export class SetlistFmRateLimiter {
  private dailyCount = 0;
  private dailyKey = '';
  private recentTimestamps: number[] = [];

  constructor(private readonly options: RateLimiterOptions) {}

  async acquire(): Promise<void> {
    this.resetDailyIfNeeded();

    if (this.dailyCount >= this.options.perDay) {
      throw new Error(
        `setlist.fm daily rate limit reached (${this.options.perDay} requests/day)`
      );
    }

    const minIntervalMs = Math.ceil(1000 / this.options.perSecond);
    const now = Date.now();
    this.recentTimestamps = this.recentTimestamps.filter((ts) => now - ts < 1000);

    if (this.recentTimestamps.length >= this.options.perSecond) {
      const waitMs = minIntervalMs - (now - this.recentTimestamps[0]);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    } else if (this.recentTimestamps.length > 0) {
      const sinceLast = now - this.recentTimestamps[this.recentTimestamps.length - 1];
      if (sinceLast < minIntervalMs) {
        await sleep(minIntervalMs - sinceLast);
      }
    }

    const stampedAt = Date.now();
    this.recentTimestamps.push(stampedAt);
    this.dailyCount += 1;
  }

  getDailyCount(): number {
    this.resetDailyIfNeeded();
    return this.dailyCount;
  }

  private resetDailyIfNeeded() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyKey !== today) {
      this.dailyKey = today;
      this.dailyCount = 0;
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createSetlistFmRateLimiterFromEnv(): SetlistFmRateLimiter {
  const perSecond = Number(process.env.SETLISTFM_RATE_LIMIT_PER_SECOND ?? '2');
  const perDay = Number(process.env.SETLISTFM_RATE_LIMIT_PER_DAY ?? '1440');

  return new SetlistFmRateLimiter({
    perSecond: Number.isFinite(perSecond) && perSecond > 0 ? perSecond : 2,
    perDay: Number.isFinite(perDay) && perDay > 0 ? perDay : 1440,
  });
}

// Singleton limiter shared by all adapter instances in this process.
let sharedLimiter: SetlistFmRateLimiter | null = null;

export function getSharedSetlistFmRateLimiter(): SetlistFmRateLimiter {
  if (!sharedLimiter) {
    sharedLimiter = createSetlistFmRateLimiterFromEnv();
  }
  return sharedLimiter;
}
