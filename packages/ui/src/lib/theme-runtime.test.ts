import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTheme } from "./theme";
import { THEME_SCRIPT, applyTheme, getResolvedTheme, installThemeRuntime } from "./theme-runtime";

const root = document.documentElement;
let osDark = false;
let osListener: (() => void) | undefined;
let frames: FrameRequestCallback[] = [];

function setOs(dark: boolean) {
  osDark = dark;
  osListener?.();
}

function flushFrames() {
  while (frames.length) frames.splice(0).forEach((frame) => frame(0));
}

function setCookie(value: string | null) {
  document.cookie = value === null ? "jf-theme=; max-age=0" : `jf-theme=${value}`;
}

beforeEach(() => {
  osDark = false;
  osListener = undefined;
  frames = [];
  vi.stubGlobal("matchMedia", (media: string) => ({
    media,
    get matches() {
      return osDark;
    },
    addEventListener: (_: string, listener: () => void) => {
      osListener = listener;
    },
  }));
  vi.stubGlobal("requestAnimationFrame", (frame: FrameRequestCallback) => frames.push(frame));
  document.head.innerHTML = `
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#eb7f00">
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#28282a">`;
});

afterEach(() => {
  setCookie(null);
  root.className = "";
  root.removeAttribute("data-theme");
  root.removeAttribute("data-theme-switching");
  Reflect.deleteProperty(window, "__jfTheme");
  vi.unstubAllGlobals();
});

const metaMedia = () =>
  [...document.querySelectorAll('meta[name="theme-color"]')].map((m) => m.getAttribute("media"));

describe("parseTheme", () => {
  it("keeps a valid preference and defaults anything else to System", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("sepia")).toBe("system");
    expect(parseTheme(undefined)).toBe("system");
  });
});

describe("installThemeRuntime", () => {
  it("applies a dark cookie before anything else runs", () => {
    setCookie("dark");
    installThemeRuntime("jf-theme");

    expect(getResolvedTheme()).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
  });

  it("stays light on a light cookie, whatever the OS says", () => {
    setCookie("light");
    osDark = true;
    installThemeRuntime("jf-theme");
    setOs(true);

    expect(getResolvedTheme()).toBe("light");
  });

  it("follows the OS with no cookie, including changes while open", () => {
    osDark = true;
    installThemeRuntime("jf-theme");
    expect(root.dataset.theme).toBe("system");
    expect(getResolvedTheme()).toBe("dark");

    setOs(false);
    expect(getResolvedTheme()).toBe("light");
  });

  it("treats an invalid cookie as System", () => {
    setCookie("sepia");
    installThemeRuntime("jf-theme");

    expect(window.__jfTheme?.preference()).toBe("system");
  });

  it("switches instantly: the transition guard is up until two frames have passed", () => {
    installThemeRuntime("jf-theme");
    flushFrames();

    applyTheme("dark");
    expect(getResolvedTheme()).toBe("dark");
    expect(root.hasAttribute("data-theme-switching")).toBe(true);

    frames.splice(0).forEach((frame) => frame(0));
    expect(root.hasAttribute("data-theme-switching")).toBe(true);
    flushFrames();
    expect(root.hasAttribute("data-theme-switching")).toBe(false);
  });

  it("points the theme-color metas at the chosen scheme, and back to the OS on System", () => {
    installThemeRuntime("jf-theme");
    expect(metaMedia()).toEqual(["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"]);

    applyTheme("dark");
    expect(metaMedia()).toEqual(["not all", "all"]);

    applyTheme("light");
    expect(metaMedia()).toEqual(["all", "not all"]);

    applyTheme("system");
    expect(metaMedia()).toEqual(["(prefers-color-scheme: light)", "(prefers-color-scheme: dark)"]);
  });
});

describe("THEME_SCRIPT", () => {
  it("runs on its own, as the inline head script does", () => {
    setCookie("dark");
    new Function(THEME_SCRIPT)();

    expect(getResolvedTheme()).toBe("dark");
    expect(window.__jfTheme?.preference()).toBe("dark");
  });
});
