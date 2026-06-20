import { db, gainerExercises, gainerSessionExercises, gainerSessions, gainerSets } from "@jf/db";
import { and, asc, eq, isNull, max, or } from "drizzle-orm";

export async function getActiveSession(userId: string) {
  const rows = await db
    .select()
    .from(gainerSessions)
    .where(and(eq(gainerSessions.userId, userId), isNull(gainerSessions.finishedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getExercises(userId: string) {
  return db
    .select()
    .from(gainerExercises)
    .where(or(isNull(gainerExercises.userId), eq(gainerExercises.userId, userId)))
    .orderBy(asc(gainerExercises.name));
}

export type SessionExerciseWithSets = {
  id: string;
  position: number;
  exercise: { id: string; name: string };
  sets: { id: string; setNumber: number; weight: string; reps: number; createdAt: Date }[];
};

export async function getSessionExercisesWithSets(
  sessionId: string
): Promise<SessionExerciseWithSets[]> {
  const [sessionExercises, sets] = await Promise.all([
    db
      .select({
        id: gainerSessionExercises.id,
        position: gainerSessionExercises.position,
        exerciseId: gainerExercises.id,
        exerciseName: gainerExercises.name,
      })
      .from(gainerSessionExercises)
      .innerJoin(gainerExercises, eq(gainerSessionExercises.exerciseId, gainerExercises.id))
      .where(eq(gainerSessionExercises.sessionId, sessionId))
      .orderBy(asc(gainerSessionExercises.position)),

    db
      .select({
        id: gainerSets.id,
        sessionExerciseId: gainerSets.sessionExerciseId,
        setNumber: gainerSets.setNumber,
        weight: gainerSets.weight,
        reps: gainerSets.reps,
        createdAt: gainerSets.createdAt,
      })
      .from(gainerSets)
      .innerJoin(
        gainerSessionExercises,
        eq(gainerSets.sessionExerciseId, gainerSessionExercises.id)
      )
      .where(eq(gainerSessionExercises.sessionId, sessionId))
      .orderBy(asc(gainerSets.setNumber)),
  ]);

  return sessionExercises.map((se) => ({
    id: se.id,
    position: se.position,
    exercise: { id: se.exerciseId, name: se.exerciseName },
    sets: sets.filter((s) => s.sessionExerciseId === se.id),
  }));
}

export type LoggedExercise = {
  id: string;
  name: string;
  isCustom: boolean;
  lastLoggedAt: Date;
};

export type ExerciseSetRow = {
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  setNumber: number;
  weight: string;
  reps: number;
};

export async function getExerciseWithSets(
  userId: string,
  exerciseId: string
): Promise<{
  exercise: { id: string; name: string; isCustom: boolean };
  sets: ExerciseSetRow[];
} | null> {
  const [exerciseRows, setRows] = await Promise.all([
    db
      .select({
        id: gainerExercises.id,
        name: gainerExercises.name,
        isCustom: gainerExercises.isCustom,
      })
      .from(gainerExercises)
      .where(eq(gainerExercises.id, exerciseId))
      .limit(1),

    db
      .select({
        sessionId: gainerSessions.id,
        sessionName: gainerSessions.name,
        sessionDate: gainerSessions.startedAt,
        setNumber: gainerSets.setNumber,
        weight: gainerSets.weight,
        reps: gainerSets.reps,
      })
      .from(gainerSets)
      .innerJoin(
        gainerSessionExercises,
        eq(gainerSets.sessionExerciseId, gainerSessionExercises.id)
      )
      .innerJoin(gainerSessions, eq(gainerSessionExercises.sessionId, gainerSessions.id))
      .where(
        and(eq(gainerSessionExercises.exerciseId, exerciseId), eq(gainerSessions.userId, userId))
      )
      .orderBy(asc(gainerSessions.startedAt), asc(gainerSets.setNumber)),
  ]);

  if (!exerciseRows[0] || setRows.length === 0) return null;

  return { exercise: exerciseRows[0], sets: setRows as ExerciseSetRow[] };
}

export async function getLoggedExercises(userId: string): Promise<LoggedExercise[]> {
  return db
    .select({
      id: gainerExercises.id,
      name: gainerExercises.name,
      isCustom: gainerExercises.isCustom,
      lastLoggedAt: max(gainerSessions.startedAt),
    })
    .from(gainerExercises)
    .innerJoin(gainerSessionExercises, eq(gainerSessionExercises.exerciseId, gainerExercises.id))
    .innerJoin(gainerSessions, eq(gainerSessionExercises.sessionId, gainerSessions.id))
    .innerJoin(gainerSets, eq(gainerSets.sessionExerciseId, gainerSessionExercises.id))
    .where(eq(gainerSessions.userId, userId))
    .groupBy(gainerExercises.id, gainerExercises.name, gainerExercises.isCustom)
    .orderBy(asc(gainerExercises.name)) as Promise<LoggedExercise[]>;
}
