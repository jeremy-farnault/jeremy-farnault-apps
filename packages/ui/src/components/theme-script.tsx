import { THEME_SCRIPT } from "../lib/theme-runtime";

/**
 * Applies the saved theme before first paint. Render it inside `<head>` in every root layout,
 * with `suppressHydrationWarning` on `<html>`: the script changes `<html>`'s class and
 * attributes before React hydrates.
 */
export function ThemeScript() {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string built from our own code, no user input.
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
