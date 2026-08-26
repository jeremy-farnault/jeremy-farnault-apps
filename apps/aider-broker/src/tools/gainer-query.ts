import { db, gainerExercises, gainerSessionExercises, gainerSessions, gainerSets } from "@jf/db";
import { and, asc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";

export interface WorkoutSessionSummary {
  name: string;
  startedAt: Date;
  finishedAt: Date;
}

export async function getWorkoutsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<WorkoutSessionSummary[]> {
  const rows = await db
    .select({
      name: gainerSessions.name,
      startedAt: gainerSessions.startedAt,
      finishedAt: gainerSessions.finishedAt,
    })
    .from(gainerSessions)
    .where(
      and(
        eq(gainerSessions.userId, userId),
        isNotNull(gainerSessions.finishedAt),
        gte(gainerSessions.startedAt, startDate),
        lte(gainerSessions.startedAt, endDate)
      )
    )
    .orderBy(gainerSessions.startedAt);

  // isNotNull() above guarantees finishedAt is set, but Drizzle doesn't
  // narrow the column type from the WHERE clause, so it's still `Date | null`.
  return rows.map((row) => ({
    name: row.name,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt as Date,
  }));
}

export interface ExerciseOnDay {
  name: string;
  type: string;
  setCount: number;
}

export interface SessionExercises {
  name: string;
  startedAt: Date;
  exercises: ExerciseOnDay[];
}

export async function getExercisesOnDay(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<SessionExercises[]> {
  const rows = await db
    .select({
      sessionId: gainerSessions.id,
      sessionName: gainerSessions.name,
      startedAt: gainerSessions.startedAt,
      exerciseName: gainerExercises.name,
      exerciseType: gainerExercises.type,
      setCount: sql<number>`count(${gainerSets.id})`,
    })
    .from(gainerSessions)
    .innerJoin(gainerSessionExercises, eq(gainerSessionExercises.sessionId, gainerSessions.id))
    .innerJoin(gainerExercises, eq(gainerExercises.id, gainerSessionExercises.exerciseId))
    .leftJoin(gainerSets, eq(gainerSets.sessionExerciseId, gainerSessionExercises.id))
    .where(
      and(
        eq(gainerSessions.userId, userId),
        gte(gainerSessions.startedAt, startDate),
        lte(gainerSessions.startedAt, endDate)
      )
    )
    .groupBy(
      gainerSessions.id,
      gainerSessions.name,
      gainerSessions.startedAt,
      gainerSessionExercises.id,
      gainerSessionExercises.position,
      gainerExercises.name,
      gainerExercises.type
    )
    .orderBy(asc(gainerSessions.startedAt), asc(gainerSessionExercises.position));

  // Fold the flat exercise rows back into per-session groups, preserving the
  // session start order and the within-session exercise position order.
  const sessions = new Map<string, SessionExercises>();
  const order: string[] = [];
  for (const row of rows) {
    let session = sessions.get(row.sessionId);
    if (!session) {
      session = { name: row.sessionName, startedAt: row.startedAt, exercises: [] };
      sessions.set(row.sessionId, session);
      order.push(row.sessionId);
    }
    session.exercises.push({
      name: row.exerciseName,
      type: row.exerciseType,
      setCount: Number(row.setCount),
    });
  }
  return order.map((id) => sessions.get(id) as SessionExercises);
}
