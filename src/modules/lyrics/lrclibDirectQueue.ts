type QueueTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const MAX_CONCURRENT_DIRECT_LRCLIB = 2;
const MIN_GAP_BETWEEN_STARTS_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Limits concurrent on-device LRCLIB fallbacks during pack download / busy retries. */
class DirectLrclibQueue {
  private active = 0;
  private readonly queue: QueueTask<unknown>[] = [];
  private lastStartMs = 0;
  private pumpScheduled = false;

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.schedulePump();
    });
  }

  private schedulePump(): void {
    if (this.pumpScheduled) return;
    this.pumpScheduled = true;
    void this.pumpLoop();
  }

  private async pumpLoop(): Promise<void> {
    while (this.active < MAX_CONCURRENT_DIRECT_LRCLIB && this.queue.length > 0) {
      const now = Date.now();
      const waitMs = Math.max(0, this.lastStartMs + MIN_GAP_BETWEEN_STARTS_MS - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }

      const task = this.queue.shift();
      if (!task) break;

      this.lastStartMs = Date.now();
      this.active += 1;
      void task
        .run()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.active -= 1;
          this.schedulePump();
        });
    }
    this.pumpScheduled = false;
    if (this.queue.length > 0 && this.active < MAX_CONCURRENT_DIRECT_LRCLIB) {
      this.schedulePump();
    }
  }
}

export const directLrclibQueue = new DirectLrclibQueue();
