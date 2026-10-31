import { describe, expect, it } from "vitest";
import { createCheckQueue } from "./check-queue";

/** A check that resolves when the test says so, recording what was running at the time. */
function controlledChecks() {
  const pending = new Map<string, (value: string) => void>();
  const started: string[] = [];
  return {
    started,
    running: () => [...pending.keys()],
    check: (linkId: string) =>
      new Promise<string>((resolve) => {
        started.push(linkId);
        pending.set(linkId, (v) => {
          pending.delete(linkId);
          resolve(v);
        });
      }),
    finish: async (linkId: string) => {
      pending.get(linkId)?.(`price of ${linkId}`);
      // Let the queue's promise callbacks run.
      await new Promise((r) => setTimeout(r, 0));
    },
  };
}

describe("createCheckQueue", () => {
  it("runs at most `concurrency` checks, one per store", async () => {
    const checks = controlledChecks();
    const results: string[] = [];
    const queue = createCheckQueue({
      concurrency: 2,
      check: checks.check,
      onResult: (id) => results.push(id),
    });

    queue.add([
      { linkId: "ps-se", store: "ps" },
      { linkId: "ps-jp", store: "ps" },
      { linkId: "kjell", store: "kjell" },
      { linkId: "steam", store: "steam" },
    ]);
    // ps-jp waits for ps-se (same store); the slots go to ps-se and kjell.
    expect(checks.running()).toEqual(["ps-se", "kjell"]);

    await checks.finish("ps-se");
    expect(results).toEqual(["ps-se"]);
    expect(checks.running()).toEqual(["kjell", "ps-jp"]);

    await checks.finish("kjell");
    await checks.finish("ps-jp");
    await checks.finish("steam");
    expect(results).toEqual(["ps-se", "kjell", "ps-jp", "steam"]);
  });

  it("doesn't queue a link twice while it's waiting or running", async () => {
    const checks = controlledChecks();
    const queue = createCheckQueue({ check: checks.check, onResult: () => {} });
    expect(queue.add([{ linkId: "a", store: "x" }])).toBe(1);
    expect(
      queue.add([
        { linkId: "a", store: "x" },
        { linkId: "b", store: "y" },
      ])
    ).toBe(1);
    expect(queue.has("a")).toBe(true);
    await checks.finish("a");
    expect(queue.has("a")).toBe(false);
  });

  it("reports a check that throws as a null result and carries on", async () => {
    const seen: [string, string | null][] = [];
    const queue = createCheckQueue<string>({
      check: async (id) => {
        if (id === "bad") throw new Error("boom");
        return id;
      },
      onResult: (id, result) => seen.push([id, result]),
    });
    queue.add([
      { linkId: "bad", store: "x" },
      { linkId: "good", store: "x" },
    ]);
    await queue.whenIdle();
    expect(seen).toEqual([
      ["bad", null],
      ["good", "good"],
    ]);
  });

  it("is idle straight away with nothing to do", async () => {
    const queue = createCheckQueue({ check: async () => null, onResult: () => {} });
    await expect(queue.whenIdle()).resolves.toEqual([]);
  });

  it("starts nothing after the deadline, lets running checks finish, and reports the rest", async () => {
    const checks = controlledChecks();
    const results: string[] = [];
    let clock = 0;
    const queue = createCheckQueue({
      concurrency: 1,
      check: checks.check,
      onResult: (id) => results.push(id),
      deadline: 100,
      now: () => clock,
    });
    queue.add([
      { linkId: "a", store: "x" },
      { linkId: "b", store: "y" },
      { linkId: "c", store: "z" },
    ]);
    const idle = queue.whenIdle();

    await checks.finish("a");
    expect(checks.running()).toEqual(["b"]);

    clock = 100;
    await checks.finish("b");
    expect(checks.started).toEqual(["a", "b"]);
    expect(results).toEqual(["a", "b"]);
    await expect(idle).resolves.toEqual(["c"]);
    expect(queue.has("c")).toBe(false);
  });

  it("drops everything when added after the deadline", async () => {
    const checks = controlledChecks();
    const queue = createCheckQueue({
      check: checks.check,
      onResult: () => {},
      deadline: 100,
      now: () => 200,
    });
    queue.add([
      { linkId: "a", store: "x" },
      { linkId: "b", store: "y" },
    ]);
    expect(checks.started).toEqual([]);
    await expect(queue.whenIdle()).resolves.toEqual(["a", "b"]);
  });

  it("runs everything without a deadline, however long it takes", async () => {
    let clock = 0;
    const queue = createCheckQueue({
      concurrency: 1,
      check: async (id) => {
        clock += 1_000_000;
        return id;
      },
      onResult: () => {},
      now: () => clock,
    });
    queue.add([
      { linkId: "a", store: "x" },
      { linkId: "b", store: "x" },
    ]);
    await expect(queue.whenIdle()).resolves.toEqual([]);
  });
});
