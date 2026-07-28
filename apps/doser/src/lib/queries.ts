import {
  db,
  doserDayOverrides,
  doserDoseLogs,
  doserMedicines,
  doserSymptomLogEntries,
  doserSymptomLogs,
  doserSymptoms,
} from "@jf/db";
import { and, asc, between, eq, inArray, isNull, or } from "drizzle-orm";
import { datesInRange, resolveOnOff } from "./cycle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Medicine = typeof doserMedicines.$inferSelect;
export type Symptom = typeof doserSymptoms.$inferSelect;

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMedicines(userId: string): Promise<Medicine[]> {
  return db
    .select()
    .from(doserMedicines)
    .where(eq(doserMedicines.userId, userId))
    .orderBy(asc(doserMedicines.createdAt));
}

async function getMedicineById(medicineId: string): Promise<Medicine> {
  const [medicine] = await db
    .select()
    .from(doserMedicines)
    .where(eq(doserMedicines.id, medicineId));
  if (!medicine) throw new Error("Medicine not found");
  return medicine;
}

/** Ownership-scoped lookup — returns undefined if the Medicine doesn't exist or isn't the user's. */
export async function getMedicineForUser(
  medicineId: string,
  userId: string
): Promise<Medicine | undefined> {
  const [medicine] = await db
    .select()
    .from(doserMedicines)
    .where(and(eq(doserMedicines.id, medicineId), eq(doserMedicines.userId, userId)));
  return medicine;
}

/** Resolves the final on/off state for a single day, letting a manual override win. */
export async function resolveMedicineDay(medicineId: string, date: string): Promise<boolean> {
  const medicine = await getMedicineById(medicineId);
  const [override] = await db
    .select()
    .from(doserDayOverrides)
    .where(and(eq(doserDayOverrides.medicineId, medicineId), eq(doserDayOverrides.date, date)));
  return resolveOnOff(medicine, date, override);
}

/** Resolves on/off for every day in a range with a single overrides query (avoids N+1 per day). */
export async function resolveMedicineDaysInRange(
  medicineId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, boolean>> {
  const medicine = await getMedicineById(medicineId);
  const overrides = await db
    .select()
    .from(doserDayOverrides)
    .where(
      and(
        eq(doserDayOverrides.medicineId, medicineId),
        between(doserDayOverrides.date, startDate, endDate)
      )
    );
  const overrideByDate = new Map(overrides.map((o) => [o.date, o]));

  const result: Record<string, boolean> = {};
  for (const date of datesInRange(startDate, endDate)) {
    result[date] = resolveOnOff(medicine, date, overrideByDate.get(date));
  }
  return result;
}

// ─── Month view (tablet visualization) ────────────────────────────────────────

export type MedicineDayState = {
  date: string;
  dayOfMonth: number;
  isOn: boolean;
  taken: boolean;
};

export type MedicineMonthView = {
  medicine: Medicine;
  days: MedicineDayState[];
};

function groupByMedicineAndDate<T extends { medicineId: string; date: string }>(
  rows: T[]
): Map<string, Map<string, T>> {
  const grouped = new Map<string, Map<string, T>>();
  for (const row of rows) {
    const byDate = grouped.get(row.medicineId) ?? new Map<string, T>();
    byDate.set(row.date, row);
    grouped.set(row.medicineId, byDate);
  }
  return grouped;
}

/**
 * Month view for every one of a user's Medicines in a single pass: one query for the medicines,
 * one for all their overrides in range, one for all their dose logs in range — regardless of how
 * many Medicines exist (same N+1-avoidance as resolveMedicineDaysInRange, extended across Medicines).
 */
export async function getMedicinesMonthView(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MedicineMonthView[]> {
  const medicines = await getMedicines(userId);
  if (medicines.length === 0) return [];

  const medicineIds = medicines.map((m) => m.id);

  const overrides = await db
    .select()
    .from(doserDayOverrides)
    .where(
      and(
        inArray(doserDayOverrides.medicineId, medicineIds),
        between(doserDayOverrides.date, startDate, endDate)
      )
    );
  const doseLogs = await db
    .select()
    .from(doserDoseLogs)
    .where(
      and(
        inArray(doserDoseLogs.medicineId, medicineIds),
        between(doserDoseLogs.date, startDate, endDate)
      )
    );

  const overridesByMedicine = groupByMedicineAndDate(overrides);
  const doseLogsByMedicine = groupByMedicineAndDate(doseLogs);
  const dates = datesInRange(startDate, endDate);

  return medicines.map((medicine) => {
    const medicineOverrides = overridesByMedicine.get(medicine.id);
    const medicineDoseLogs = doseLogsByMedicine.get(medicine.id);

    const days: MedicineDayState[] = dates.map((date) => {
      const isOn = resolveOnOff(medicine, date, medicineOverrides?.get(date));
      const taken = isOn ? (medicineDoseLogs?.get(date)?.taken ?? false) : false;
      return { date, dayOfMonth: Number(date.slice(-2)), isOn, taken };
    });

    return { medicine, days };
  });
}

// ─── Symptoms ──────────────────────────────────────────────────────────────────

/** Global presets (userId IS NULL) plus this user's own custom symptoms. */
export async function getSymptoms(userId: string): Promise<Symptom[]> {
  return db
    .select()
    .from(doserSymptoms)
    .where(or(isNull(doserSymptoms.userId), eq(doserSymptoms.userId, userId)))
    .orderBy(asc(doserSymptoms.name));
}

export type SymptomLogDetail = {
  symptomIds: string[];
  note: string | null;
};

/**
 * Symptom log detail (selected symptom ids + note) for every logged day in a range, in two
 * queries regardless of how many days have entries — same batching approach as
 * getMedicinesMonthView, since the day-detail modal can be opened for any day without a fresh
 * per-day round trip.
 */
export async function getSymptomLogsMonthView(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, SymptomLogDetail>> {
  const logs = await db
    .select()
    .from(doserSymptomLogs)
    .where(
      and(eq(doserSymptomLogs.userId, userId), between(doserSymptomLogs.date, startDate, endDate))
    );

  if (logs.length === 0) return {};

  const logIds = logs.map((log) => log.id);
  const entries = await db
    .select()
    .from(doserSymptomLogEntries)
    .where(inArray(doserSymptomLogEntries.symptomLogId, logIds));

  const symptomIdsByLogId = new Map<string, string[]>();
  for (const entry of entries) {
    const ids = symptomIdsByLogId.get(entry.symptomLogId) ?? [];
    ids.push(entry.symptomId);
    symptomIdsByLogId.set(entry.symptomLogId, ids);
  }

  const result: Record<string, SymptomLogDetail> = {};
  for (const log of logs) {
    result[log.date] = { symptomIds: symptomIdsByLogId.get(log.id) ?? [], note: log.note };
  }
  return result;
}
