"use client";

import { useEffect, useState } from "react";
import { Toaster, type ToasterProps } from "sonner";
import type { ResolvedTheme } from "../lib/theme";
import { getResolvedTheme } from "../lib/theme-runtime";

/** The theme the page currently shows, following every switch (toggle, sync or OS). */
export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    setTheme(getResolvedTheme());
    const observer = new MutationObserver(() => setTheme(getResolvedTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

/** Sonner's `Toaster`, drawn in the page's current theme. */
export function ThemedToaster(props: Omit<ToasterProps, "theme">) {
  return <Toaster {...props} theme={useResolvedTheme()} />;
}
