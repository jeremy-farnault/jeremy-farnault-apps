// Runs price checks a few at a time, never more than one per store at once, so opening the
// page doesn't fire a burst of requests at the same shop. Results come back one by one so
// each row can update as soon as its own check is done.

export type CheckJob = {
  linkId: string;
  /** Requests to one store run one at a time. */
  store: string;
};

export type QueueOptions<R> = {
  concurrency?: number;
  check: (linkId: string) => Promise<R>;
  onResult: (linkId: string, result: R | null) => void;
};

export function createCheckQueue<R>({ concurrency = 3, check, onResult }: QueueOptions<R>) {
  const waiting: CheckJob[] = [];
  const known = new Set<string>();
  const busyStores = new Set<string>();
  let running = 0;
  let idle: (() => void)[] = [];

  function pump() {
    while (running < concurrency) {
      const index = waiting.findIndex((job) => !busyStores.has(job.store));
      if (index === -1) break;
      const [job] = waiting.splice(index, 1);
      if (!job) break;
      running += 1;
      busyStores.add(job.store);
      check(job.linkId)
        .then(
          (result) => onResult(job.linkId, result),
          () => onResult(job.linkId, null)
        )
        .finally(() => {
          running -= 1;
          busyStores.delete(job.store);
          known.delete(job.linkId);
          pump();
        });
    }
    if (running === 0 && waiting.length === 0) {
      const done = idle;
      idle = [];
      for (const resolve of done) resolve();
    }
  }

  return {
    /** Queues links not already waiting or running; returns how many were added. */
    add(jobs: CheckJob[]): number {
      let added = 0;
      for (const job of jobs) {
        if (known.has(job.linkId)) continue;
        known.add(job.linkId);
        waiting.push(job);
        added += 1;
      }
      pump();
      return added;
    },
    /** Whether a link is waiting or being checked. */
    has(linkId: string): boolean {
      return known.has(linkId);
    },
    /** Resolves once nothing is waiting or running. */
    whenIdle(): Promise<void> {
      if (running === 0 && waiting.length === 0) return Promise.resolve();
      return new Promise((resolve) => idle.push(resolve));
    },
  };
}
