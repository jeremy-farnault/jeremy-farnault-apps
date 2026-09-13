import {
  db,
  unifierArcs,
  unifierPersons,
  unifierSlotValues,
  unifierSlots,
  unifierTouches,
} from "@jf/db";
import { and, asc, desc, eq, ilike, max } from "drizzle-orm";

export type ArcRow = {
  id: string;
  name: string;
  color: string | null;
  position: string;
};

export type PersonRow = {
  id: string;
  arcId: string;
  name: string;
  note: string | null;
  important: boolean;
  flaggedAt: Date | null;
};

export type SlotRow = {
  id: string;
  arcId: string;
  label: string;
  position: string;
};

export type UnifierData = {
  arcs: ArcRow[];
  persons: PersonRow[];
  slots: SlotRow[];
  /**
   * personId → their most recent touch. A person absent from this map has never been
   * touched; the orbit reads that as maximal drift. Aggregated in one grouped query
   * rather than fetching every touch just to find each maximum.
   */
  lastTouchAt: Record<string, Date>;
};

/**
 * Every arc the user owns, in `position` order, plus all their people as one flat
 * list. People are grouped by arc in the client (mirroring how Organiser fetches
 * cards flat and groups them per column), and are not manually ordered within an
 * arc — they sort by name.
 *
 * Deliberately does *not* create or seed anything on first visit: a brand-new user
 * must land on the first-run empty state.
 */
export async function getArcsAndPeople(userId: string): Promise<UnifierData> {
  const [arcs, persons, slots, touchMaxes] = await Promise.all([
    db
      .select({
        id: unifierArcs.id,
        name: unifierArcs.name,
        color: unifierArcs.color,
        position: unifierArcs.position,
      })
      .from(unifierArcs)
      .where(eq(unifierArcs.userId, userId))
      .orderBy(asc(unifierArcs.position), asc(unifierArcs.id)),
    db
      .select({
        id: unifierPersons.id,
        arcId: unifierPersons.arcId,
        name: unifierPersons.name,
        note: unifierPersons.note,
        important: unifierPersons.important,
        flaggedAt: unifierPersons.flaggedAt,
      })
      .from(unifierPersons)
      .where(eq(unifierPersons.userId, userId))
      .orderBy(asc(unifierPersons.name), asc(unifierPersons.id)),
    db
      .select({
        id: unifierSlots.id,
        arcId: unifierSlots.arcId,
        label: unifierSlots.label,
        position: unifierSlots.position,
      })
      .from(unifierSlots)
      .where(eq(unifierSlots.userId, userId))
      .orderBy(asc(unifierSlots.position), asc(unifierSlots.id)),
    db
      .select({
        personId: unifierTouches.personId,
        lastTouchAt: max(unifierTouches.occurredAt),
      })
      .from(unifierTouches)
      .where(eq(unifierTouches.userId, userId))
      .groupBy(unifierTouches.personId),
  ]);

  const lastTouchAt: Record<string, Date> = {};
  for (const row of touchMaxes) {
    if (row.lastTouchAt) lastTouchAt[row.personId] = row.lastTouchAt;
  }

  return { arcs, persons, slots, lastTouchAt };
}

export type TouchRow = {
  id: string;
  note: string | null;
  occurredAt: Date;
};

export type PersonDetail = {
  person: PersonRow;
  arc: ArcRow;
  /** The arc's slot template, in template order. */
  slots: SlotRow[];
  /** slotId → this person's value. Missing keys are unfilled slots. */
  values: Record<string, string | null>;
  /** Reverse-chronological, most recent first. Drift is derived from this. */
  touches: TouchRow[];
};

/**
 * One person with the slot template they inherit from their arc and their own values.
 *
 * Returns null when the person does not exist or belongs to another user, so the route
 * can 404 without leaking whether the id is real.
 */
export async function getPersonDetail(
  userId: string,
  personId: string
): Promise<PersonDetail | null> {
  const persons = await db
    .select({
      id: unifierPersons.id,
      arcId: unifierPersons.arcId,
      name: unifierPersons.name,
      note: unifierPersons.note,
      important: unifierPersons.important,
      flaggedAt: unifierPersons.flaggedAt,
    })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const person = persons[0];
  if (!person) return null;

  const [arcs, slots, valueRows, touches] = await Promise.all([
    db
      .select({
        id: unifierArcs.id,
        name: unifierArcs.name,
        color: unifierArcs.color,
        position: unifierArcs.position,
      })
      .from(unifierArcs)
      .where(and(eq(unifierArcs.id, person.arcId), eq(unifierArcs.userId, userId)))
      .limit(1),
    db
      .select({
        id: unifierSlots.id,
        arcId: unifierSlots.arcId,
        label: unifierSlots.label,
        position: unifierSlots.position,
      })
      .from(unifierSlots)
      .where(and(eq(unifierSlots.arcId, person.arcId), eq(unifierSlots.userId, userId)))
      .orderBy(asc(unifierSlots.position), asc(unifierSlots.id)),
    db
      .select({ slotId: unifierSlotValues.slotId, value: unifierSlotValues.value })
      .from(unifierSlotValues)
      .where(and(eq(unifierSlotValues.personId, personId), eq(unifierSlotValues.userId, userId))),
    db
      .select({
        id: unifierTouches.id,
        note: unifierTouches.note,
        occurredAt: unifierTouches.occurredAt,
      })
      .from(unifierTouches)
      .where(and(eq(unifierTouches.personId, personId), eq(unifierTouches.userId, userId)))
      .orderBy(desc(unifierTouches.occurredAt), desc(unifierTouches.id)),
  ]);

  const arc = arcs[0];
  if (!arc) return null;

  const values: Record<string, string | null> = {};
  for (const row of valueRows) values[row.slotId] = row.value;

  return { person, arc, slots, values, touches };
}

export type PersonSearchRow = {
  id: string;
  name: string;
  arcName: string;
  arcColor: string | null;
};

/** ILIKE treats these as wildcards, so a name containing them must escape them. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * People whose name matches `query`, across every arc, scoped to the user. Backs the
 * jump-to-person control — the fast path to the daily loop, which is almost always
 * "open a specific person and update them".
 *
 * Names only: notes and touch contents are deliberately not searched.
 */
export async function searchPeople(userId: string, query: string): Promise<PersonSearchRow[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return db
    .select({
      id: unifierPersons.id,
      name: unifierPersons.name,
      arcName: unifierArcs.name,
      arcColor: unifierArcs.color,
    })
    .from(unifierPersons)
    .innerJoin(unifierArcs, eq(unifierPersons.arcId, unifierArcs.id))
    .where(
      and(eq(unifierPersons.userId, userId), ilike(unifierPersons.name, `%${escapeLike(trimmed)}%`))
    )
    .orderBy(asc(unifierPersons.name), asc(unifierPersons.id))
    .limit(20);
}
