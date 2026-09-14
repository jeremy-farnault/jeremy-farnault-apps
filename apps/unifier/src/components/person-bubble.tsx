"use client";

import { cn, getColorForeground } from "@jf/ui";

/** A person's initials: first + last word, so two people in an arc rarely collide. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? words[words.length - 1]?.[0] : undefined;
  return (last ? `${first}${last}` : first).toUpperCase();
}

/** The colour a person's bubble takes: their own override, else their arc's. */
export function bubbleColor(
  personColor: string | null | undefined,
  arcColor: string | null | undefined
): string {
  return personColor ?? arcColor ?? "var(--primary)";
}

type Props = {
  name: string;
  avatarUrl: string | null;
  /** The person's own colour override; null falls back to `arcColor`. */
  color: string | null;
  arcColor: string | null;
  /** Rendered size in px — the same bubble serves a 24px list row and a 30px orbit dot. */
  size: number;
  /** Critical-flag halo, in px, from `ringFor`. Omitted when the person isn't flagged. */
  ring?: { gap: number; width: number; opacity: number } | undefined;
  /** Draws a thin surface-coloured halo, so crowded bubbles stay separate. */
  outlined?: boolean;
  className?: string;
};

/**
 * One person, as one element: their photo if they have one, their initials on their
 * colour if they don't, wearing the critical ring when flagged. Used at every size the
 * app needs, so a person looks the same in the orbit, the list, and search.
 */
export function PersonBubble({
  name,
  avatarUrl,
  color,
  arcColor,
  size,
  ring,
  outlined,
  className,
}: Props) {
  const background = bubbleColor(color, arcColor);

  // Everything outside the bubble is a shadow rather than a border or an outline: it
  // never eats into the face, and it can grow with the flag's age without moving
  // anything. The flag's gap ring doubles as the separator an outlined bubble gets.
  const halo = ring
    ? `0 0 0 ${ring.gap}px var(--surface-100), 0 0 0 ${ring.gap + ring.width}px color-mix(in srgb, var(--red-500) ${Math.round(ring.opacity * 100)}%, transparent)`
    : outlined
      ? "0 0 0 1.5px var(--surface-100)"
      : undefined;

  const style: React.CSSProperties = {
    width: size,
    height: size,
    ...(halo ? { boxShadow: halo } : {}),
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        style={style}
        className={cn("shrink-0 rounded-full bg-(--surface-200) object-cover", className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{
        ...style,
        backgroundColor: background,
        color: getColorForeground(background),
        // Initials track the bubble so one component covers 24px rows and 30px dots.
        fontSize: Math.max(9, Math.round(size * 0.38)),
      }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold leading-none",
        className
      )}
    >
      {initialsFor(name)}
    </span>
  );
}
