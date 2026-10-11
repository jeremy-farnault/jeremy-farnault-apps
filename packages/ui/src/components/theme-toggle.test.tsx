import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Theme } from "../lib/theme";
import { getResolvedTheme, installThemeRuntime } from "../lib/theme-runtime";
import { ThemeToggle } from "./theme-toggle";

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));

let osDark = false;

beforeEach(() => {
  osDark = false;
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return osDark;
    },
    addEventListener: () => {},
  }));
  vi.stubGlobal("requestAnimationFrame", () => 0);
  installThemeRuntime("jf-theme");
});

afterEach(() => {
  cleanup();
  document.documentElement.className = "";
  Reflect.deleteProperty(window, "__jfTheme");
  vi.unstubAllGlobals();
  toastError.mockReset();
});

const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;

describe("ThemeToggle", () => {
  it("marks the current preference", () => {
    render(<ThemeToggle onChange={vi.fn()} />);
    expect(radio("System").checked).toBe(true);
  });

  it("switches the page at once and saves the choice", async () => {
    const onChange = vi.fn<(theme: Theme) => Promise<void>>().mockResolvedValue();
    render(<ThemeToggle onChange={onChange} />);

    await userEvent.click(radio("Dark"));

    expect(getResolvedTheme()).toBe("dark");
    expect(radio("Dark").checked).toBe(true);
    expect(onChange).toHaveBeenCalledWith("dark");
  });

  it("reverts the page and the control, with a toast, when the save fails", async () => {
    const onChange = vi.fn<(theme: Theme) => Promise<void>>().mockRejectedValue(new Error());
    render(<ThemeToggle onChange={onChange} />);

    await userEvent.click(radio("Dark"));

    expect(getResolvedTheme()).toBe("light");
    expect(radio("System").checked).toBe(true);
    expect(toastError).toHaveBeenCalled();
  });

  it("shows what System currently resolves to", async () => {
    osDark = true;
    act(() => window.__jfTheme?.apply("system"));
    render(<ThemeToggle onChange={vi.fn()} />);

    expect(await screen.findByText(/currently dark/)).toBeTruthy();
  });

  it("moves and selects with the arrow keys", async () => {
    // user-event's radio navigation calls CSS.escape, which jsdom lacks.
    vi.stubGlobal("CSS", { escape: (value: string) => value });
    const onChange = vi.fn<(theme: Theme) => Promise<void>>().mockResolvedValue();
    render(<ThemeToggle onChange={onChange} />);

    await userEvent.tab();
    expect(document.activeElement).toBe(radio("System"));
    await userEvent.keyboard("{ArrowLeft}");

    expect(radio("Dark").checked).toBe(true);
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});
