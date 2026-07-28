import {
  db,
  doserDayOverrides,
  doserDoseLogs,
  doserMedicines,
  doserPillTypes,
  doserSymptomLogEntries,
  doserSymptomLogs,
  doserSymptoms,
} from "@jf/db";
import { and, asc, between, eq, inArray, isNull, or } from "drizzle-orm";
import { type CyclePattern, datesInRange, resolveDay } from "./cycle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Medicine = typeof doserMedicines.$inferSelect;
export type PillType = typeof doserPillTypes.$inferSelect;
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

async function getMedicinePillTypes(medicineId: string): Promise<PillType[]> {
  return db
    .select()
    .from(doserPillTypes)
    .where(eq(doserPillTypes.medicineId, medicineId))
    .orderBy(asc(doserPillTypes.position));
}

async function getCyclePattern(medicine: Medicine): Promise<CyclePattern> {
  const types = await getMedicinePillTypes(medicine.id);
  return { cycleStartDate: medicine.cycleStartDate, daysOff: medicine.daysOff, types };
}

/** Resolves the final on/off state for a single day, letting a manual override win. */
export async function resolveMedicineDay(medicineId: string, date: string): Promise<boolean> {
  const medicine = await getMedicineById(medicineId);
  const pattern = await getCyclePattern(medicine);
  const [override] = await db
    .select()
    .from(doserDayOverrides)
    .where(and(eq(doserDayOverrides.medicineId, medicineId), eq(doserDayOverrides.date, date)));
  return resolveDay(pattern, date, override).isOn;
}

// ─── Month view (tablet visualization) ────────────────────────────────────────

export type ActiveType = {
  id: string;
  name: string | null;
  color: string;
};

export type MedicineDayState = {
  date: string;
  dayOfMonth: number;
  activeType: ActiveType | null;
  taken: boolean;
};

export type MedicineMonthView = {
  medicine: Medicine;
  types: PillType[];
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

function groupByMedicine<T extends { medicineId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.medicineId) ?? [];
    list.push(row);
    grouped.set(row.medicineId, list);
  }
  return grouped;
}

/**
 * Month view for every one of a user's Medicines in a single pass: one query for the medicines,
 * one for all their pill types, one for all their overrides in range, one for all their dose logs
 * in range — regardless of how many Medicines exist (same N+1-avoidance established in earlier
 * tickets, extended to cover pill types too).
 */
export async function getMedicinesMonthView(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MedicineMonthView[]> {
  const medicines = await getMedicines(userId);
  if (medicines.length === 0) return [];

  const medicineIds = medicines.map((m) => m.id);

  const [types, overrides, doseLogs] = await Promise.all([
    db
      .select()
      .from(doserPillTypes)
      .where(inArray(doserPillTypes.medicineId, medicineIds))
      .orderBy(asc(doserPillTypes.position)),
    db
      .select()
      .from(doserDayOverrides)
      .where(
        and(
          inArray(doserDayOverrides.medicineId, medicineIds),
          between(doserDayOverrides.date, startDate, endDate)
        )
      ),
    db
      .select()
      .from(doserDoseLogs)
      .where(
        and(
          inArray(doserDoseLogs.medicineId, medicineIds),
          between(doserDoseLogs.date, startDate, endDate)
        )
      ),
  ]);

  const typesByMedicine = groupByMedicine(types);
  const overridesByMedicine = groupByMedicineAndDate(overrides);
  const doseLogsByMedicine = groupByMedicineAndDate(doseLogs);
  const dates = datesInRange(startDate, endDate);

  return medicines.map((medicine) => {
    const medicineTypes = typesByMedicine.get(medicine.id) ?? [];
    const pattern: CyclePattern = {
      cycleStartDate: medicine.cycleStartDate,
      daysOff: medicine.daysOff,
      types: medicineTypes,
    };
    const medicineOverrides = overridesByMedicine.get(medicine.id);
    const medicineDoseLogs = doseLogsByMedicine.get(medicine.id);

    const days: MedicineDayState[] = dates.map((date) => {
      const resolved = resolveDay(pattern, date, medicineOverrides?.get(date));
      const taken = resolved.isOn ? (medicineDoseLogs?.get(date)?.taken ?? false) : false;
      return {
        date,
        dayOfMonth: Number(date.slice(-2)),
        activeType: resolved.type
          ? { id: resolved.type.id, name: resolved.type.name, color: resolved.type.color }
          : null,
        taken,
      };
    });

    return { medicine, types: medicineTypes, days };
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
