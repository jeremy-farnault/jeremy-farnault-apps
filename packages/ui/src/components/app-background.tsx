import type { CSSProperties } from "react";

interface AppBackgroundProps {
  // URL of the app's scene SVG, made with `pnpm generate:background` (lines opaque, rest
  // transparent). It is only a stencil: the colour is the app's --primary.
  src: string;
}

// Line art fixed to the bottom of the viewport, behind the page content.
// Styled by `.app-background` in globals.css.
export function AppBackground({ src }: AppBackgroundProps) {
  return (
    <div
      aria-hidden
      className="app-background"
      style={{ "--app-background-src": `url("${src}")` } as CSSProperties}
    />
  );
}
