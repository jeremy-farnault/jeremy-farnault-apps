"use client";

import { XIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

// Furyodachi's furyo, one tap away from every app (ticket 15 of the game).
// The badge polls the save API's status route (on load, on focus and every few minutes) for a
// red dot when a vital is under 25%. The game itself loads only on a tap, in an iframe to its
// embed mode: a portrait popover on desktop, full screen on mobile. Closing removes the iframe.
// Logged out (the API answers 401) or the API unreachable, the badge doesn't show.

const GAME_URL = process.env.NEXT_PUBLIC_FURYODACHI_URL ?? "https://furyodachi.jeremyfarnault.com";
const API_URL = process.env.NEXT_PUBLIC_FURYO_API_URL ?? "https://furyo-api.jeremyfarnault.com";
const POLL_MS = 5 * 60 * 1000;

// His face, the game's 32 px favicon, inlined so nothing loads from the game before a tap.
const FACE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAACA0lEQVR4nNXVP0hVYRjH8Y/h0NDQEJhLSIWD5JJpDYmpQ4VJEZWURUODmZJDBBUFQk0FRWCUUVvYkP2hvKSReRezhsxIHYLConDrD9RYNtyOca5e71GQe/1t73me9z3P8z2/9zk5RYUlEzKo3KiJo+9eRcorKiyZVQGLZpU9D0pLIOj8240ToeenLlwHBzaWgtfvv4CmeCI/KonsJ5CsXefaQuszvf1gZ0HBnArIOIGcVNcw+PbPD23G/06fdt0FA5cuhvKTSTTFh5HeC9lPoLpgybQbO083Y6onAvWO/cQCIJD2Fgzn1oKHHWfB5ZrdYOmGSpD3qwe0xO6A2rrt/3aORCog+wncr/gKykpXgZb8H6F4sA7ixRMfQW/EArKfwKRGnoCyjqvg+4s+UHh0T2J98+ScCsg4gZRzIFAwD65sWgP27d82bV4wD6Le/0AZJ5DSA0Hneav3gntjjxKBW10zHrhsZXFof9ZPwikeCCo/2HQcxB53hzbEbw+AlrrloLwxMQnb2g+H8vLzV4C3/TGkJpFxApMeSO480LPWHaCq9QHojL8Bi6vPR3pBOk9kD4FkDQ6NgvqhuR08Pv4pUl72Eeju+Qx+/0l0ULN1CzjWsBZUtSbc3txwDandv3AJrKsoBy/7hkPP69sHZzwo6DxZ6ysbQezDkWnjGSeQ9m843/oLe5ObUwovbzAAAAAASUVORK5CYII=";

/** What the status route answers. */
export type FuryoStatus =
  | { status: "none" }
  | { status: "unknown" }
  | { status: "furyo"; name: string; needsYou: boolean; over: boolean };

interface FuryoBadgeProps {
  gameUrl?: string;
  apiUrl?: string;
  pollMs?: number;
}

export function FuryoBadge({
  gameUrl = GAME_URL,
  apiUrl = API_URL,
  pollMs = POLL_MS,
}: FuryoBadgeProps) {
  const [status, setStatus] = useState<FuryoStatus | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/status`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) return setStatus(null);
      if (res.ok) setStatus((await res.json()) as FuryoStatus);
      // Any other failure keeps the last status: a blip shouldn't hide him.
    } catch {
      // Offline or the API down: same.
    }
  }, [apiUrl]);

  useEffect(() => {
    if (open) return;
    void refresh();
    const onFocus = () => void refresh();
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void refresh(), pollMs);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [open, refresh, pollMs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!status) return null;

  const name = status.status === "furyo" ? status.name : "Furyodachi";
  const needsYou = status.status === "furyo" && status.needsYou;
  // No furyo yet: straight to the new-game screen.
  const src = `${gameUrl}/embed${status.status === "none" ? "?new" : ""}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={needsYou ? `${name} needs you` : `Open ${name}`}
        aria-expanded={open}
        className="fixed right-4 bottom-4 z-[4500] rounded-xl border border-(--border) bg-(--surface-raised) p-1.5 shadow-[0_8px_24px_0_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
      >
        <img
          src={FACE}
          alt=""
          width={32}
          height={32}
          className="block rounded-md [image-rendering:pixelated]"
        />
        {needsYou && (
          <span
            data-testid="furyo-red-dot"
            className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-(--surface-raised) bg-(--red-500)"
          />
        )}
      </button>

      {open && (
        <dialog
          open
          aria-label={name}
          className="fixed inset-0 z-[4600] m-0 flex h-dvh max-h-none w-full max-w-none flex-col overflow-hidden border-0 p-0 text-(--text) bg-(--surface-raised) md:inset-auto md:right-4 md:bottom-20 md:h-[680px] md:max-h-[calc(100dvh-6rem)] md:w-[360px] md:rounded-2xl md:border md:border-(--border) md:shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]"
        >
          <div className="flex h-10 shrink-0 items-center justify-between px-3 text-sm font-semibold text-(--text)">
            <span>{name}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-lg p-1 text-(--text-secondary) hover:bg-(--surface-sunken)"
            >
              <XIcon size={18} />
            </button>
          </div>
          <iframe src={src} title={name} className="block w-full flex-1 border-0" />
        </dialog>
      )}
    </>
  );
}
