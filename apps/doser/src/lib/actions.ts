"use server";

import { auth } from "@jf/auth";
import {
  db,
  doserDayOverrides,
  doserDoseLogs,
  doserMedicines,
  doserSymptomLogEntries,
  doserSymptomLogs,
  doserSymptoms,
} from "@jf/db";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { type Medicine, type Symptom, getMedicineForUser, resolveMedicineDay } from "./queries";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Mutation actions ─────────────────────────────────────────────────────────

export async function createMedicineAction(input: {
  name: string;
  daysOn: number;
  daysOff: number;
  cycleStartDate: string;
  color: string;
}): Promise<Medicine> {
  const userId = await getAuthUserId();
  const [medicine] = await db
    .insert(doserMedicines)
    .values({
      userId,
      name: input.name,
      daysOn: input.daysOn,
      daysOff: input.daysOff,
      cycleStartDate: input.cycleStartDate,
      color: input.color,
    })
    .returning();
  if (!medicine) throw new Error("Failed to create medicine");
  revalidatePath("/", "layout");
  return medicine;
}

export async function updateMedicineAction(input: {
  id: string;
  name: string;
  daysOn: number;
  daysOff: number;
  cycleStartDate: string;
  color: string;
}): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(doserMedicines)
    .set({
      name: input.name,
      daysOn: input.daysOn,
      daysOff: input.daysOff,
      cycleStartDate: input.cycleStartDate,
      color: input.color,
      updatedAt: new Date(),
    })
    .where(and(eq(doserMedicines.id, input.id), eq(doserMedicines.userId, userId)));
  revalidatePath("/", "layout");
}

/**
 * Sets (not toggles) whether a dose was taken on a given day, since the client already computed
 * the next value for its own optimistic update. No-ops on an off day — mirrors the client-side
 * guard as defense-in-depth (e.g. an override could flip the day between page load and tap).
 */
export async function setDoseTakenAction(input: {
  medicineId: string;
  date: string;
  taken: boolean;
}): Promise<void> {
  const userId = await getAuthUserId();
  const medicine = await getMedicineForUser(input.medicineId, userId);
  if (!medicine) throw new Error("Medicine not found");

  const isOn = await resolveMedicineDay(input.medicineId, input.date);
  if (!isOn) return;

  await db
    .insert(doserDoseLogs)
    .values({ medicineId: input.medicineId, date: input.date, taken: input.taken })
    .onConflictDoUpdate({
      target: [doserDoseLogs.medicineId, doserDoseLogs.date],
      set: { taken: input.taken, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
}

/** Sets a manual on/off override for a specific day, taking precedence over the computed cycle. */
export async function setDayOverrideAction(input: {
  medicineId: string;
  date: string;
  isOn: boolean;
}): Promise<void> {
  const userId = await getAuthUserId();
  const medicine = await getMedicineForUser(input.medicineId, userId);
  if (!medicine) throw new Error("Medicine not found");

  await db
    .insert(doserDayOverrides)
    .values({ medicineId: input.medicineId, date: input.date, isOn: input.isOn })
    .onConflictDoUpdate({
      target: [doserDayOverrides.medicineId, doserDayOverrides.date],
      set: { isOn: input.isOn, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
}

/** Removes a manual override, reverting a day back to its computed cycle value. Idempotent. */
export async function clearDayOverrideAction(input: {
  medicineId: string;
  date: string;
}): Promise<void> {
  const userId = await getAuthUserId();
  const medicine = await getMedicineForUser(input.medicineId, userId);
  if (!medicine) throw new Error("Medicine not found");

  await db
    .delete(doserDayOverrides)
    .where(
      and(
        eq(doserDayOverrides.medicineId, input.medicineId),
        eq(doserDayOverrides.date, input.date)
      )
    );
  revalidatePath("/", "layout");
}

/**
 * Creates a custom symptom tag, or returns the existing one if a case-insensitive match already
 * exists — checked against both global presets and this user's own customs, so a user can't end up
 * with a redundant tag sitting next to an existing one of (almost) the same name.
 */
export async function createSymptomAction(name: string): Promise<Symptom> {
  const userId = await getAuthUserId();
  const trimmedName = name.trim();

  const [existing] = await db
    .select()
    .from(doserSymptoms)
    .where(
      and(
        or(isNull(doserSymptoms.userId), eq(doserSymptoms.userId, userId)),
        eq(sql`lower(${doserSymptoms.name})`, trimmedName.toLowerCase())
      )
    );
  if (existing) return existing;

  const [symptom] = await db
    .insert(doserSymptoms)
    .values({ userId, name: trimmedName, isCustom: true })
    .returning();
  if (!symptom) throw new Error("Failed to create symptom");
  revalidatePath("/", "layout");
  return symptom;
}

/**
 * Saves the full set of selected symptoms + note for a day in one batch (no per-toggle round
 * trips). Deletes the doserSymptomLogs row entirely when nothing is selected and there's no note
 * (AC #5), otherwise upserts the row and replaces its join-table entries wholesale — simpler than
 * diffing added/removed symptoms individually.
 */
export async function setSymptomLogAction(input: {
  date: string;
  symptomIds: string[];
  note: string | null;
}): Promise<void> {
  const userId = await getAuthUserId();
  const trimmedNote = input.note?.trim() || null;

  if (input.symptomIds.length === 0 && !trimmedNote) {
    await db
      .delete(doserSymptomLogs)
      .where(and(eq(doserSymptomLogs.userId, userId), eq(doserSymptomLogs.date, input.date)));
    revalidatePath("/", "layout");
    return;
  }

  const [log] = await db
    .insert(doserSymptomLogs)
    .values({ userId, date: input.date, note: trimmedNote })
    .onConflictDoUpdate({
      target: [doserSymptomLogs.userId, doserSymptomLogs.date],
      set: { note: trimmedNote, updatedAt: new Date() },
    })
    .returning();
  if (!log) throw new Error("Failed to save symptom log");

  await db.delete(doserSymptomLogEntries).where(eq(doserSymptomLogEntries.symptomLogId, log.id));
  if (input.symptomIds.length > 0) {
    await db
      .insert(doserSymptomLogEntries)
      .values(input.symptomIds.map((symptomId) => ({ symptomLogId: log.id, symptomId })));
  }
  revalidatePath("/", "layout");
}
