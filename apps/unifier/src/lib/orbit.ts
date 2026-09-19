import { driftDays } from "./drift";

/**
 * Orbit geometry. Position *is* the triage: angle says which arc a person is in,
 * radius says how far they have drifted, and a flagged person carries a halo ring that
 * grows with the flag's age.
 *
 * Everything here is a pure function of (arcs, people, touch history, now) so the view
 * can be re-derived on every render — logging a touch moves a dot with no stored state.
 */

/** viewBox is square; all geometry is in these units. */
export const VIEW = 400;
export const CENTRE = VIEW / 2;

/** Radial band the dots occupy. The inner hole keeps "me" readable at the centre. */
const MIN_RADIUS = 44;
const MAX_RADIUS = 176;

/**
 * The horizon the whole radial scale is proportional to, and as far out as anyone gets:
 * drift at or past it shares the outermost guide ring, while `never touched` still sits
 * alone outside that. Moving it rescales every dot — keep GUIDE_DAYS ending on it.
 */
export const DRIFT_CAP_DAYS = 90;
/** Touched people stop short of the rim so "never touched" owns the outer edge. */
const TOUCHED_MAX_FRACTION = 0.94;

/** Guide rings, in days — reference marks up to the horizon, which ends the list. */
export const GUIDE_DAYS = [7, 30, 90] as const;

/** Flag age at which the ring stops growing, so an old flag stays legible. */
const RING_CAP_DAYS = 90;

/**
 * The person bubble's rendered diameter, in CSS pixels. Bubbles are deliberately *not*
 * in viewBox units: holding them at a fixed on-screen size while the geometry zooms is
 * what lets zooming pull a crowded arc apart instead of magnifying it unchanged.
 */
export const BUBBLE_SIZE = 24;
/** Padding around the bubble that still counts as a tap. */
export const BUBBLE_HIT_PADDING = 4;

/** The orbit's widest rendered size, in CSS px — the frame's own max-width. */
export const FRAME_MAX_PX = 640;

/** "me" at the centre: rendered diameter in CSS px at that full-width frame. */
export const ME_SIZE = 48;

/**
 * CSS px → viewBox units at the full-width frame. "me" sits in the zooming geometry
 * rather than the fixed-size overlay, so its size is specified in px here and converted
 * once, which is what keeps it a stated multiple of a person bubble.
 */
export const pxToUnits = (px: number) => (px * VIEW) / FRAME_MAX_PX;

/** Ring geometry, in px: the clear gap around the bubble and the stroke outside it. */
const RING_MIN_GAP = 3;
const RING_MAX_GAP = 10;
const RING_MIN_WIDTH = 1.5;
const RING_MAX_WIDTH = 3;

/**
 * Drift as a 0..1 fraction of the radial band — a straight fraction of the horizon, so
 * distance out from the hub *is* elapsed time. That makes the guide rings divide the
 * band exactly (a ring at half the horizon sits at half the distance) and gives every
 * day of drift the same step, so 27 days and 29 days are not the same spot.
 *
 * The cost is that the freshly-touched crowd shares a thin annulus near the hub: a week
 * is only 7/90 of the band. That is what proportional spacing honestly means, and what
 * the zoom is for. Never-touched returns exactly 1: the far edge, alone outside everyone.
 */
export function driftFraction(days: number): number {
  if (!Number.isFinite(days)) return 1;
  const capped = Math.min(Math.max(days, 0), DRIFT_CAP_DAYS);
  return (capped / DRIFT_CAP_DAYS) * TOUCHED_MAX_FRACTION;
}

/** Distance from the centre, in viewBox units, for a given drift in days. */
export function radiusForDrift(days: number): number {
  return MIN_RADIUS + driftFraction(days) * (MAX_RADIUS - MIN_RADIUS);
}

/** The angular wedge belonging to arc `index` of `count`, starting at 12 o'clock. */
export function sectorFor(index: number, count: number): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: Math.PI * 2 };
  const span = (Math.PI * 2) / count;
  const start = -Math.PI / 2 + index * span;
  return { start, end: start + span };
}

/**
 * A person's angle inside their arc's sector — an even fan, in a stable order, with the
 * sector edges padded so neighbouring arcs never collide. Stable means a dot's angle
 * only moves when the arc's membership changes, never when a touch is logged.
 */
export function angleInSector(
  index: number,
  count: number,
  sector: { start: number; end: number },
  padFraction = 0.16
): number {
  const span = sector.end - sector.start;
  if (count <= 1) return sector.start + span / 2;
  const pad = span * padFraction;
  const inner = span - pad * 2;
  return sector.start + pad + (inner * index) / (count - 1);
}

/** Polar → cartesian, in viewBox units. */
export function pointAt(angle: number, radius: number): { x: number; y: number } {
  return { x: CENTRE + Math.cos(angle) * radius, y: CENTRE + Math.sin(angle) * radius };
}

/**
 * The halo ring for a flagged person: it widens and strengthens with the age of the
 * flag, capped so an ancient flag stays legible rather than swallowing its neighbours.
 * Deliberately a function of `flaggedAt` alone — never of drift, so logging a touch
 * cannot quieten it.
 *
 * Expressed in px rather than viewBox units, because the bubble it wraps is drawn in
 * the HTML overlay at a fixed on-screen size.
 */
export function ringFor(
  flaggedAt: Date | null,
  now: Date
): { gap: number; width: number; opacity: number } | null {
  if (!flaggedAt) return null;
  const age = driftDays(flaggedAt, now);
  const t = Math.min(Number.isFinite(age) ? age : RING_CAP_DAYS, RING_CAP_DAYS) / RING_CAP_DAYS;
  return {
    gap: RING_MIN_GAP + t * (RING_MAX_GAP - RING_MIN_GAP),
    width: RING_MIN_WIDTH + t * (RING_MAX_WIDTH - RING_MIN_WIDTH),
    opacity: 0.35 + t * 0.5,
  };
}

export type OrbitPerson = {
  id: string;
  name: string;
  arcId: string;
  avatarUrl: string | null;
  /** Their own bubble colour; null inherits the arc's. */
  color: string | null;
  important: boolean;
  flaggedAt: Date | null;
};

export type OrbitArc = { id: string; name: string; color: string | null; position: string };

export type OrbitDot = {
  id: string;
  name: string;
  arcName: string;
  avatarUrl: string | null;
  /** The bubble's background, already resolved from person → arc → accent. */
  color: string;
  /** The arc's own colour, which the spoke uses regardless of any person override. */
  arcColor: string;
  x: number;
  y: number;
  driftDays: number;
  ring: { gap: number; width: number; opacity: number } | null;
};

/**
 * Lays out every person as a dot. `arcs` must already be in `position` order — sector
 * order follows it. People are fanned across their arc's sector in the order given.
 */
export function layoutOrbit(
  arcs: OrbitArc[],
  people: OrbitPerson[],
  lastTouchAt: Record<string, Date | undefined>,
  now: Date
): OrbitDot[] {
  const dots: OrbitDot[] = [];

  arcs.forEach((arc, arcIndex) => {
    const sector = sectorFor(arcIndex, arcs.length);
    const members = people.filter((p) => p.arcId === arc.id);

    members.forEach((person, i) => {
      const angle = angleInSector(i, members.length, sector);
      const days = driftDays(lastTouchAt[person.id] ?? null, now);
      const { x, y } = pointAt(angle, radiusForDrift(days));
      dots.push({
        id: person.id,
        name: person.name,
        arcName: arc.name,
        avatarUrl: person.avatarUrl,
        color: person.color ?? arc.color ?? "var(--primary)",
        arcColor: arc.color ?? "var(--primary)",
        x,
        y,
        driftDays: days,
        ring: person.important ? ringFor(person.flaggedAt, now) : null,
      });
    });
  });

  return dots;
}
