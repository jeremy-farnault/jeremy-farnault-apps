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

/** Drift beyond this compresses no further; `never touched` still sits outside it. */
const DRIFT_CAP_DAYS = 365;
/** Touched people stop short of the rim so "never touched" owns the outer edge. */
const TOUCHED_MAX_FRACTION = 0.92;

/** Guide rings, in days — unlabelled reference marks for week / month / quarter. */
export const GUIDE_DAYS = [7, 30, 90] as const;

/** Flag age at which the ring stops growing, so an old flag stays legible. */
const RING_CAP_DAYS = 90;
export const DOT_RADIUS = 7;
const RING_MIN_GAP = 4;
const RING_MAX_GAP = 13;

/**
 * Drift as a 0..1 fraction of the radial band. Compressed with log1p so a year-long
 * gap doesn't visually dwarf the difference between one week and one month — the range
 * that actually matters. Never-touched returns exactly 1: the far edge.
 */
export function driftFraction(days: number): number {
  if (!Number.isFinite(days)) return 1;
  const capped = Math.min(Math.max(days, 0), DRIFT_CAP_DAYS);
  const t = Math.log1p(capped) / Math.log1p(DRIFT_CAP_DAYS);
  return t * TOUCHED_MAX_FRACTION;
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
 */
export function ringFor(
  flaggedAt: Date | null,
  now: Date
): { radius: number; opacity: number; width: number } | null {
  if (!flaggedAt) return null;
  const age = driftDays(flaggedAt, now);
  const t = Math.min(Number.isFinite(age) ? age : RING_CAP_DAYS, RING_CAP_DAYS) / RING_CAP_DAYS;
  return {
    radius: DOT_RADIUS + RING_MIN_GAP + t * (RING_MAX_GAP - RING_MIN_GAP),
    opacity: 0.35 + t * 0.5,
    width: 1.5 + t * 1.5,
  };
}

export type OrbitPerson = {
  id: string;
  name: string;
  arcId: string;
  important: boolean;
  flaggedAt: Date | null;
};

export type OrbitArc = { id: string; name: string; color: string | null; position: string };

export type OrbitDot = {
  id: string;
  name: string;
  arcName: string;
  color: string;
  x: number;
  y: number;
  driftDays: number;
  ring: { radius: number; opacity: number; width: number } | null;
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
        color: arc.color ?? "var(--primary)",
        x,
        y,
        driftDays: days,
        ring: person.important ? ringFor(person.flaggedAt, now) : null,
      });
    });
  });

  return dots;
}
