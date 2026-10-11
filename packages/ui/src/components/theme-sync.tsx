"use client";

import { useEffect } from "react";
import type { Theme } from "../lib/theme";
import { applyTheme } from "../lib/theme-runtime";

/** Once per tab session is enough: the cookie only goes stale when changed elsewhere. */
const SYNCED_KEY = "jf-theme-synced";

type ThemeSyncProps = {
  /**
   * The server action that brings the cookie in line with the saved preference and returns
   * it (`syncThemeCookie` from `@jf/auth/settings-actions`), or null when signed out. Passed
   * in so @jf/ui stays free of auth and database code.
   */
  sync: () => Promise<Theme | null>;
};

/**
 * Keeps the theme cookie in step with the saved preference. Pages are static, so instead of
 * reading the row while rendering, this asks the server once per tab session and switches the
 * page when the saved theme differs from what the cookie said. Render it in protected layouts.
 */
export function ThemeSync({ sync }: ThemeSyncProps) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SYNCED_KEY)) return;
    } catch {
      // Storage blocked: sync on every load instead.
    }

    sync()
      .then((theme) => {
        try {
          sessionStorage.setItem(SYNCED_KEY, "1");
        } catch {}
        if (theme && theme !== window.__jfTheme?.preference()) applyTheme(theme);
      })
      .catch(() => {
        // Offline or signed out mid-request: keep what the cookie said and retry next load.
      });
  }, [sync]);

  return null;
}
