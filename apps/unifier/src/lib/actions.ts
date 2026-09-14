"use server";

import { auth } from "@jf/auth";
import {
  db,
  unifierArcs,
  unifierPersons,
  unifierSlotValues,
  unifierSlots,
  unifierTouches,
} from "@jf/db";
import { keyAfter } from "@jf/ui/ordering";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import {
  type ArcRow,
  type PersonRow,
  type PersonSearchRow,
  type SlotRow,
  type TouchRow,
  searchPeople,
} from "./queries";
import { deleteS3Object, generatePresignedUploadUrl } from "./s3";
import { getPublicImageUrl } from "./s3-url";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

/** The person columns every mutation returns, so the client's row never loses a field. */
const personReturning = {
  id: unifierPersons.id,
  arcId: unifierPersons.arcId,
  name: unifierPersons.name,
  avatarKey: unifierPersons.avatarKey,
  color: unifierPersons.color,
  note: unifierPersons.note,
  important: unifierPersons.important,
  flaggedAt: unifierPersons.flaggedAt,
};

/** Resolves the stored avatar key into the URL the client renders. */
function toPersonRow(row: Omit<PersonRow, "avatarUrl">): PersonRow {
  return { ...row, avatarUrl: row.avatarKey ? getPublicImageUrl(row.avatarKey) : null };
}

/** Creates an arc at the end of the user's current arc order. */
export async function createArcAction(input: {
  name: string;
  color?: string | null;
}): Promise<ArcRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();

  // Append after the user's current last arc.
  const last = await db
    .select({ position: unifierArcs.position })
    .from(unifierArcs)
    .where(eq(unifierArcs.userId, userId))
    .orderBy(desc(unifierArcs.position))
    .limit(1);
  const position = keyAfter(last[0]?.position ?? null);

  const inserted = await db
    .insert(unifierArcs)
    .values({ userId, name, color: input.color ?? null, position })
    .returning({
      id: unifierArcs.id,
      name: unifierArcs.name,
      color: unifierArcs.color,
      position: unifierArcs.position,
    });

  const arc = inserted[0];
  if (!arc) throw new Error("Failed to create arc");
  return arc;
}

/**
 * Adds a person to an arc by name. A person always belongs to exactly one arc, so
 * `arcId` is required and is re-verified against the session user before insert.
 */
export async function createPersonAction(input: {
  arcId: string;
  name: string;
  color?: string | null;
  avatarKey?: string | null;
}): Promise<PersonRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();

  // Verify the arc belongs to the user before attaching anyone to it.
  const arcs = await db
    .select({ id: unifierArcs.id })
    .from(unifierArcs)
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)))
    .limit(1);
  if (!arcs[0]) throw new Error("Arc not found");

  const inserted = await db
    .insert(unifierPersons)
    .values({
      userId,
      arcId: input.arcId,
      name,
      color: input.color ?? null,
      avatarKey: input.avatarKey ?? null,
    })
    .returning(personReturning);

  const person = inserted[0];
  if (!person) throw new Error("Failed to create person");
  return toPersonRow(person);
}

/** Updates an arc's name and palette colour. */
export async function updateArcAction(input: {
  arcId: string;
  name: string;
  color: string | null;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();
  await db
    .update(unifierArcs)
    .set({ name, color: input.color, updatedAt: new Date() })
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)));
}

/** Reorders an arc. The client computes the fractional key; only this row is written. */
export async function moveArcAction(input: { arcId: string; position: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .update(unifierArcs)
    .set({ position: input.position, updatedAt: new Date() })
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)));
}

/** Slot labels are compared case-insensitively on their trimmed text. */
function normaliseLabel(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Re-bases a person's slot values from their current arc onto `targetArcId`'s template.
 *
 * Slots are per-arc rows, so a source slot and a destination slot are always different
 * rows — the only meaningful notion of a "counterpart" is the label. Values whose label
 * exists in the destination are repointed at the destination's slot; values with no
 * counterpart are dropped (the feature doc: standing context worth keeping belongs in
 * the free note, not a slot).
 *
 * A no-op until ticket 06 introduces slot templates.
 */
async function rebaseSlotValues(
  userId: string,
  personId: string,
  targetArcId: string
): Promise<void> {
  // The person's current values, with the label of the slot each one hangs off.
  const current = await db
    .select({ valueId: unifierSlotValues.id, label: unifierSlots.label })
    .from(unifierSlotValues)
    .innerJoin(unifierSlots, eq(unifierSlotValues.slotId, unifierSlots.id))
    .where(and(eq(unifierSlotValues.personId, personId), eq(unifierSlotValues.userId, userId)));

  if (current.length === 0) return;

  const targetSlots = await db
    .select({ id: unifierSlots.id, label: unifierSlots.label })
    .from(unifierSlots)
    .where(and(eq(unifierSlots.arcId, targetArcId), eq(unifierSlots.userId, userId)))
    .orderBy(asc(unifierSlots.position));

  const byLabel = new Map<string, string>();
  for (const slot of targetSlots) {
    // First slot wins if the destination itself holds two labels that normalise alike.
    if (!byLabel.has(normaliseLabel(slot.label))) {
      byLabel.set(normaliseLabel(slot.label), slot.id);
    }
  }

  const drop: string[] = [];
  const claimed = new Set<string>();

  for (const value of current) {
    const targetSlotId = byLabel.get(normaliseLabel(value.label));
    // Two source labels can normalise onto one destination slot; only the first may
    // take it, or the unique (personId, slotId) constraint would reject the update.
    if (!targetSlotId || claimed.has(targetSlotId)) {
      drop.push(value.valueId);
      continue;
    }
    claimed.add(targetSlotId);
    await db
      .update(unifierSlotValues)
      .set({ slotId: targetSlotId })
      .where(and(eq(unifierSlotValues.id, value.valueId), eq(unifierSlotValues.userId, userId)));
  }

  if (drop.length > 0) {
    await db
      .delete(unifierSlotValues)
      .where(and(inArray(unifierSlotValues.id, drop), eq(unifierSlotValues.userId, userId)));
  }
}

/** Presigns a single avatar upload; the browser PUTs the file straight to S3. */
export async function generatePresignedUploadUrlAction(
  filename: string
): Promise<{ key: string; url: string }> {
  return generatePresignedUploadUrl(filename);
}

/**
 * Updates a person's name, arc, bubble colour and avatar in one write — the person
 * form modal edits them together, so splitting this into four actions would mean four
 * round-trips for one save.
 *
 * A changed arc re-bases slot values onto the destination template, exactly as
 * `movePersonAction` does. A replaced or removed avatar deletes the old S3 object:
 * nothing else ever references it, so leaving it behind is pure litter.
 */
export async function updatePersonAction(input: {
  personId: string;
  name: string;
  arcId: string;
  color: string | null;
  avatarKey: string | null;
}): Promise<PersonRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();

  const persons = await db
    .select({
      id: unifierPersons.id,
      arcId: unifierPersons.arcId,
      avatarKey: unifierPersons.avatarKey,
    })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const current = persons[0];
  if (!current) throw new Error("Person not found");

  const arcs = await db
    .select({ id: unifierArcs.id })
    .from(unifierArcs)
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)))
    .limit(1);
  if (!arcs[0]) throw new Error("Arc not found");

  if (current.arcId !== input.arcId) {
    await rebaseSlotValues(userId, current.id, input.arcId);
  }

  const updated = await db
    .update(unifierPersons)
    .set({
      name,
      arcId: input.arcId,
      color: input.color,
      avatarKey: input.avatarKey,
      updatedAt: new Date(),
    })
    .where(and(eq(unifierPersons.id, current.id), eq(unifierPersons.userId, userId)))
    .returning(personReturning);

  const row = updated[0];
  if (!row) throw new Error("Failed to update person");

  if (current.avatarKey && current.avatarKey !== input.avatarKey) {
    await deleteS3Object(current.avatarKey);
  }

  return toPersonRow(row);
}

/**
 * Deletes a person. Their slot values and touches go with them via the FK cascades;
 * their avatar object is removed here, since nothing cascades into S3.
 */
export async function deletePersonAction(input: { personId: string }): Promise<void> {
  const userId = await getUserId();

  const persons = await db
    .select({ avatarKey: unifierPersons.avatarKey })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const person = persons[0];
  if (!person) throw new Error("Person not found");

  await db
    .delete(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)));

  if (person.avatarKey) await deleteS3Object(person.avatarKey);
}

/** Moves a person into another arc, re-basing their slot values onto its template. */
export async function movePersonAction(input: {
  personId: string;
  targetArcId: string;
}): Promise<PersonRow> {
  const userId = await getUserId();

  const persons = await db
    .select({ id: unifierPersons.id, arcId: unifierPersons.arcId })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const person = persons[0];
  if (!person) throw new Error("Person not found");

  const arcs = await db
    .select({ id: unifierArcs.id })
    .from(unifierArcs)
    .where(and(eq(unifierArcs.id, input.targetArcId), eq(unifierArcs.userId, userId)))
    .limit(1);
  if (!arcs[0]) throw new Error("Arc not found");

  await rebaseSlotValues(userId, person.id, input.targetArcId);

  const updated = await db
    .update(unifierPersons)
    .set({ arcId: input.targetArcId, updatedAt: new Date() })
    .where(and(eq(unifierPersons.id, person.id), eq(unifierPersons.userId, userId)))
    .returning(personReturning);

  const row = updated[0];
  if (!row) throw new Error("Failed to move person");
  return toPersonRow(row);
}

type DeleteArcInput =
  | { arcId: string; mode: "delete-people" }
  | { arcId: string; mode: "move-people"; targetArcId: string };

/**
 * Deletes an arc. A non-empty arc must say explicitly what happens to its people —
 * they are either re-homed into another arc or deleted alongside it, never silently
 * destroyed. Deleting the arc cascades to its slots, any remaining people, and their
 * slot values and touches.
 *
 * Unlike Organiser's columns there is no "cannot delete the last one" rule: zero arcs
 * is a valid state that returns the user to the first-run empty state.
 */
export async function deleteArcAction(
  input: DeleteArcInput
): Promise<{ movedPersons: PersonRow[] }> {
  const userId = await getUserId();

  const source = await db
    .select({ id: unifierArcs.id })
    .from(unifierArcs)
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)))
    .limit(1);
  if (!source[0]) throw new Error("Arc not found");

  const movedPersons: PersonRow[] = [];

  if (input.mode === "move-people") {
    if (input.targetArcId === input.arcId) {
      throw new Error("Target arc must differ from the arc being deleted");
    }
    const target = await db
      .select({ id: unifierArcs.id })
      .from(unifierArcs)
      .where(and(eq(unifierArcs.id, input.targetArcId), eq(unifierArcs.userId, userId)))
      .limit(1);
    if (!target[0]) throw new Error("Target arc not found");

    const people = await db
      .select({ id: unifierPersons.id })
      .from(unifierPersons)
      .where(and(eq(unifierPersons.arcId, input.arcId), eq(unifierPersons.userId, userId)))
      .orderBy(asc(unifierPersons.name), asc(unifierPersons.id));

    for (const person of people) {
      // A bulk re-home is still a move, so it re-bases like a single move does.
      await rebaseSlotValues(userId, person.id, input.targetArcId);
      const updated = await db
        .update(unifierPersons)
        .set({ arcId: input.targetArcId, updatedAt: new Date() })
        .where(and(eq(unifierPersons.id, person.id), eq(unifierPersons.userId, userId)))
        .returning(personReturning);
      if (updated[0]) movedPersons.push(toPersonRow(updated[0]));
    }
  }

  await db
    .delete(unifierArcs)
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)));

  return { movedPersons };
}

/** Adds a slot to an arc's template, at the end of its current slot order. */
export async function createSlotAction(input: {
  arcId: string;
  label: string;
}): Promise<SlotRow> {
  const label = input.label.trim();
  if (!label) throw new Error("Label is required");

  const userId = await getUserId();

  const arcs = await db
    .select({ id: unifierArcs.id })
    .from(unifierArcs)
    .where(and(eq(unifierArcs.id, input.arcId), eq(unifierArcs.userId, userId)))
    .limit(1);
  if (!arcs[0]) throw new Error("Arc not found");

  const last = await db
    .select({ position: unifierSlots.position })
    .from(unifierSlots)
    .where(and(eq(unifierSlots.arcId, input.arcId), eq(unifierSlots.userId, userId)))
    .orderBy(desc(unifierSlots.position))
    .limit(1);

  const inserted = await db
    .insert(unifierSlots)
    .values({ userId, arcId: input.arcId, label, position: keyAfter(last[0]?.position ?? null) })
    .returning({
      id: unifierSlots.id,
      arcId: unifierSlots.arcId,
      label: unifierSlots.label,
      position: unifierSlots.position,
    });

  const slot = inserted[0];
  if (!slot) throw new Error("Failed to create slot");
  return slot;
}

/** Renames a slot. The change is inherited by every person in the arc. */
export async function updateSlotAction(input: { slotId: string; label: string }): Promise<void> {
  const label = input.label.trim();
  if (!label) throw new Error("Label is required");

  const userId = await getUserId();
  await db
    .update(unifierSlots)
    .set({ label, updatedAt: new Date() })
    .where(and(eq(unifierSlots.id, input.slotId), eq(unifierSlots.userId, userId)));
}

/** Reorders a slot within its arc. The client computes the fractional key. */
export async function moveSlotAction(input: { slotId: string; position: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .update(unifierSlots)
    .set({ position: input.position, updatedAt: new Date() })
    .where(and(eq(unifierSlots.id, input.slotId), eq(unifierSlots.userId, userId)));
}

/**
 * Removes a slot from an arc's template. Every person's value for it goes with it,
 * via the FK cascade on `unifier_slot_values.slot_id`.
 */
export async function deleteSlotAction(input: { slotId: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .delete(unifierSlots)
    .where(and(eq(unifierSlots.id, input.slotId), eq(unifierSlots.userId, userId)));
}

/**
 * Sets one person's value for one slot. Blanking a value removes the row rather than
 * storing an empty string, so an unfilled slot is always the absence of a row.
 *
 * The slot must belong to the person's own arc — people only ever carry their arc's
 * template, never a slot borrowed from elsewhere.
 */
export async function setSlotValueAction(input: {
  personId: string;
  slotId: string;
  value: string;
}): Promise<void> {
  const userId = await getUserId();

  const persons = await db
    .select({ arcId: unifierPersons.arcId })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const person = persons[0];
  if (!person) throw new Error("Person not found");

  const slots = await db
    .select({ id: unifierSlots.id })
    .from(unifierSlots)
    .where(
      and(
        eq(unifierSlots.id, input.slotId),
        eq(unifierSlots.userId, userId),
        eq(unifierSlots.arcId, person.arcId)
      )
    )
    .limit(1);
  if (!slots[0]) throw new Error("Slot not found");

  const value = input.value.trim();

  if (!value) {
    await db
      .delete(unifierSlotValues)
      .where(
        and(
          eq(unifierSlotValues.personId, input.personId),
          eq(unifierSlotValues.slotId, input.slotId),
          eq(unifierSlotValues.userId, userId)
        )
      );
    return;
  }

  await db
    .insert(unifierSlotValues)
    .values({ userId, personId: input.personId, slotId: input.slotId, value })
    .onConflictDoUpdate({
      target: [unifierSlotValues.personId, unifierSlotValues.slotId],
      set: { value },
    });
}

/**
 * Saves a person's free-text note — the standing overflow for anything the arc's slots
 * don't capture. Blanking it stores null rather than an empty string.
 */
export async function updatePersonNoteAction(input: {
  personId: string;
  note: string;
}): Promise<void> {
  const userId = await getUserId();
  const note = input.note.trim();
  await db
    .update(unifierPersons)
    .set({ note: note === "" ? null : note, updatedAt: new Date() })
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)));
}

/**
 * Logs a contact with a person, stamped now. The note is optional — a bare touch is the
 * one-tap case, and it is the only thing that reduces drift.
 *
 * Deliberately does not write any status field: drift is derived from touch history at
 * render time, so there is nothing here to keep in sync.
 */
export async function logTouchAction(input: {
  personId: string;
  note?: string;
}): Promise<TouchRow> {
  const userId = await getUserId();

  const persons = await db
    .select({ id: unifierPersons.id })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  if (!persons[0]) throw new Error("Person not found");

  const note = input.note?.trim();

  const inserted = await db
    .insert(unifierTouches)
    .values({ userId, personId: input.personId, note: note ? note : null })
    .returning({
      id: unifierTouches.id,
      note: unifierTouches.note,
      occurredAt: unifierTouches.occurredAt,
    });

  const touch = inserted[0];
  if (!touch) throw new Error("Failed to log touch");
  return touch;
}

/**
 * Toggles a person's critical flag — "there's something here I don't want to forget".
 *
 * Turning it on stamps `flaggedAt` so the orbit can grow its ring with the flag's age;
 * turning it off clears both fields, representing genuine resolution. Re-flagging a
 * person who is *already* flagged leaves the original `flaggedAt` intact, so a stray
 * double-toggle can't quietly reset how loud the situation has become.
 *
 * There is no due date, checkbox, or done-state here by design: this is an attention
 * marker, not a task. Anything wanting task semantics belongs in Organiser.
 */
export async function setPersonImportantAction(input: {
  personId: string;
  important: boolean;
}): Promise<PersonRow> {
  const userId = await getUserId();

  const persons = await db
    .select({ important: unifierPersons.important, flaggedAt: unifierPersons.flaggedAt })
    .from(unifierPersons)
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .limit(1);
  const current = persons[0];
  if (!current) throw new Error("Person not found");

  const flaggedAt = input.important
    ? current.important && current.flaggedAt
      ? current.flaggedAt
      : new Date()
    : null;

  const updated = await db
    .update(unifierPersons)
    .set({ important: input.important, flaggedAt, updatedAt: new Date() })
    .where(and(eq(unifierPersons.id, input.personId), eq(unifierPersons.userId, userId)))
    .returning(personReturning);

  const row = updated[0];
  if (!row) throw new Error("Failed to update flag");
  return toPersonRow(row);
}

/** Name search backing the jump-to-person control, scoped to the session user. */
export async function searchPeopleAction(query: string): Promise<PersonSearchRow[]> {
  const userId = await getUserId();
  return searchPeople(userId, query);
}
