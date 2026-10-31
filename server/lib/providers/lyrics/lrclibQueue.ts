type QueueTask<T> = {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

export class LrclibRequestQueue {
  private active = 0;
  private readonly queue: QueueTask<unknown>[] = [];

  constructor(private readonly maxConcurrent: number) {}

  enqueue<T>(run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: run as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  private pump(): void {
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) return;
      this.active += 1;
      void task
        .run()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}
