// Runs price checks a few at a time, never more than one per store at once, so opening the
// page doesn't fire a burst of requests at the same shop. Results come back one by one so
// each row can update as soon as its own check is done.

export type CheckJob = {
  linkId: string;
  /** Requests to one store run one at a time. */
  store: string;
};

/** The store a link's requests go to, so the queue can keep to one at a time per store. */
export function storeKey(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export type QueueOptions<R> = {
  concurrency?: number;
  check: (linkId: string) => Promise<R>;
  onResult: (linkId: string, result: R | null) => void;
  /**
   * When to stop starting checks, in epoch ms. Checks already running finish; the ones still
   * waiting are dropped, and `whenIdle` reports them. The morning run uses it to send its
   * email before the function's time limit.
   */
  deadline?: number;
  /** Injected so tests control the clock. */
  now?: () => number;
};

export function createCheckQueue<R>({
  concurrency = 3,
  check,
  onResult,
  deadline,
  now = Date.now,
}: QueueOptions<R>) {
  const waiting: CheckJob[] = [];
  const known = new Set<string>();
  const busyStores = new Set<string>();
  const dropped: string[] = [];
  let running = 0;
  let idle: ((dropped: string[]) => void)[] = [];

  function pump() {
    if (deadline !== undefined && now() >= deadline) {
      for (const job of waiting.splice(0)) {
        known.delete(job.linkId);
        dropped.push(job.linkId);
      }
    }
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
      for (const resolve of done) resolve([...dropped]);
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
    /** Resolves once nothing is waiting or running, with the links the deadline dropped. */
    whenIdle(): Promise<string[]> {
      if (running === 0 && waiting.length === 0) return Promise.resolve([...dropped]);
      return new Promise((resolve) => idle.push(resolve));
    },
  };
}
