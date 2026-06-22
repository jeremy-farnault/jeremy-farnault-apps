import { ExerciseCard } from "@/components/exercise-card";
import { FinishSessionButton } from "@/components/finish-session-button";
import { LogCta } from "@/components/log-cta";
import { StartSessionButton } from "@/components/start-session-button";
import type { LastSessionSummary, SessionExerciseWithSets } from "@/lib/queries";
import type { gainerExercises, gainerSessions } from "@jf/db";

interface LogTabProps {
  activeSession: typeof gainerSessions.$inferSelect | null;
  exercises: (typeof gainerExercises.$inferSelect)[];
  sessionExercisesWithSets: SessionExerciseWithSets[];
  lastSessionStats: Record<string, LastSessionSummary>;
}

export function LogTab({
  activeSession,
  exercises,
  sessionExercisesWithSets,
  lastSessionStats,
}: LogTabProps) {
  if (!activeSession) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-(--grey-600) text-sm">No active session. Start one to begin logging.</p>
        <StartSessionButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-(--grey-900)">{activeSession.name}</h2>
        <FinishSessionButton sessionId={activeSession.id} />
      </div>

      {sessionExercisesWithSets.length === 0 ? (
        <p className="text-(--grey-600) text-sm">No exercises yet. Add one to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sessionExercisesWithSets.map((se) => {
            const lastSession = lastSessionStats[se.exercise.id];
            return <ExerciseCard key={se.id} data={se} {...(lastSession ? { lastSession } : {})} />;
          })}
        </div>
      )}

      <LogCta sessionId={activeSession.id} exercises={exercises} />
    </div>
  );
}
