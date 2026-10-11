// The browser side of theming: the head script and the helpers that drive it. DOM only.

import { type ResolvedTheme, THEME_COOKIE, type Theme } from "./theme";

/** The runtime the head script installs on `window`, for the toggle and the sync to drive. */
export type ThemeRuntime = {
  /** Switches to a preference, instantly (no colour transition). */
  apply(preference: Theme): void;
  preference(): Theme;
};

declare global {
  interface Window {
    __jfTheme?: ThemeRuntime;
  }
}

/**
 * Runs in `<head>` before first paint, serialised by `THEME_SCRIPT` — so it must stay
 * self-contained: no imports and no references to module scope. It reads the
 * preference from the cookie, puts `dark` on `<html>` when it resolves dark, follows the OS
 * while the preference is System, and points the `theme-color` metas at the chosen scheme so
 * the iOS status bar follows the preference rather than the OS.
 *
 * Every change after the first paint sets `data-theme-switching` on `<html>` for two frames,
 * which `globals.css` uses to drop the 300 ms colour transition: a theme switch is instant
 * instead of animating every element on the page.
 */
export function installThemeRuntime(cookieName: string): void {
  const root = document.documentElement;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const match = document.cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]*)`));
  const initial = match ? decodeURIComponent(match[1] as string) : "";
  let current: Theme = initial === "light" || initial === "dark" ? initial : "system";

  function pointThemeColor(dark: boolean) {
    const metas = document.querySelectorAll('meta[name="theme-color"]');
    for (let i = 0; i < metas.length; i++) {
      const meta = metas[i] as Element;
      let media = meta.getAttribute("data-media");
      if (media === null) {
        media = meta.getAttribute("media") || "";
        meta.setAttribute("data-media", media);
      }
      const forDark = media.indexOf("dark") !== -1;
      meta.setAttribute(
        "media",
        current === "system" ? media : forDark === dark ? "all" : "not all"
      );
    }
  }

  function render() {
    const dark = current === "dark" || (current === "system" && query.matches);
    root.setAttribute("data-theme-switching", "");
    root.classList.toggle("dark", dark);
    root.setAttribute("data-theme", current);
    pointThemeColor(dark);
    // Two frames: the first paints the new colours, the second lets transitions back in.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.removeAttribute("data-theme-switching");
      });
    });
  }

  window.__jfTheme = {
    apply: (preference) => {
      current = preference === "light" || preference === "dark" ? preference : "system";
      render();
    },
    preference: () => current,
  };

  query.addEventListener("change", () => {
    if (current === "system") render();
  });
  render();
  // Next may stream the metadata in after this script; point the metas once they exist.
  document.addEventListener("DOMContentLoaded", () => {
    pointThemeColor(root.classList.contains("dark"));
  });
}

/** The inline `<head>` script: the runtime above, called with the shared cookie name. */
export const THEME_SCRIPT = `(${installThemeRuntime.toString()})(${JSON.stringify(THEME_COOKIE)})`;

/** Switches the open page to a preference. A no-op where the head script has not run. */
export function applyTheme(preference: Theme): void {
  window.__jfTheme?.apply(preference);
}

/** What the open page currently shows. */
export function getResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
