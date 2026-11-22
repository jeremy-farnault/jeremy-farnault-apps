import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FuryoBadge, type FuryoStatus } from "./furyo-badge";

const API = "https://furyo-api.test";
const GAME = "https://furyodachi.test";

let answer: { status: number; body?: FuryoStatus } | Error;
const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
  if (answer instanceof Error) throw answer;
  return new Response(answer.body ? JSON.stringify(answer.body) : null, { status: answer.status });
});

const ken = (needsYou: boolean): FuryoStatus => ({
  status: "furyo",
  name: "Ken",
  needsYou,
  over: false,
});

async function renderBadge() {
  render(<FuryoBadge apiUrl={API} gameUrl={GAME} pollMs={60_000} />);
  // Let the first status fetch resolve.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

const badge = () => screen.queryByRole("button", { name: /Ken|Furyodachi/ });
const iframe = () => document.querySelector("iframe");

function tapBadge() {
  const button = badge();
  if (!button) throw new Error("no badge");
  fireEvent.click(button);
}

beforeEach(() => {
  vi.useFakeTimers();
  answer = { status: 200, body: ken(false) };
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("FuryoBadge", () => {
  it("asks the status route with the session cookie", async () => {
    await renderBadge();
    expect(fetchMock).toHaveBeenCalledWith(
      `${API}/api/status`,
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("shows him with no red dot when he's fine", async () => {
    await renderBadge();
    expect(badge()).not.toBeNull();
    expect(screen.queryByTestId("furyo-red-dot")).toBeNull();
    expect(screen.getByRole("button", { name: "Open Ken" })).toBeTruthy();
  });

  it("shows the red dot when he needs you", async () => {
    answer = { status: 200, body: ken(true) };
    await renderBadge();
    expect(screen.getByTestId("furyo-red-dot")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ken needs you" })).toBeTruthy();
  });

  it("doesn't show when logged out", async () => {
    answer = { status: 401 };
    await renderBadge();
    expect(badge()).toBeNull();
  });

  it("doesn't show when the API can't be reached", async () => {
    answer = new TypeError("offline");
    await renderBadge();
    expect(badge()).toBeNull();
  });

  it("loads nothing from the game until the tap", async () => {
    await renderBadge();
    expect(iframe()).toBeNull();
    expect(fetchMock.mock.calls.every(([url]) => !url.startsWith(GAME))).toBe(true);
  });

  it("opens the game's embed mode in an iframe on tap, and removes it on close", async () => {
    await renderBadge();
    tapBadge();
    expect(iframe()?.getAttribute("src")).toBe(`${GAME}/embed`);
    expect(screen.getByRole("dialog", { name: "Ken" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(iframe()).toBeNull();
  });

  it("closes with Escape, and with a second tap on the badge", async () => {
    await renderBadge();
    tapBadge();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(iframe()).toBeNull();
    tapBadge();
    tapBadge();
    expect(iframe()).toBeNull();
  });

  it("opens the new-game screen when there's no furyo yet", async () => {
    answer = { status: 200, body: { status: "none" } };
    await renderBadge();
    fireEvent.click(screen.getByRole("button", { name: "Open Furyodachi" }));
    expect(iframe()?.getAttribute("src")).toBe(`${GAME}/embed?new`);
  });

  it("polls every few minutes and on focus", async () => {
    await renderBadge();
    const calls = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchMock.mock.calls.length).toBe(calls + 1);
    answer = { status: 200, body: ken(true) };
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("furyo-red-dot")).toBeTruthy();
  });

  it("doesn't poll while the game is open, and refreshes when it closes", async () => {
    await renderBadge();
    tapBadge();
    const calls = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });
    expect(fetchMock.mock.calls.length).toBe(calls);
    answer = { status: 200, body: ken(true) };
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("furyo-red-dot")).toBeTruthy();
  });

  it("keeps showing him through a failed poll", async () => {
    await renderBadge();
    answer = { status: 500 };
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(badge()).not.toBeNull();
  });
});
