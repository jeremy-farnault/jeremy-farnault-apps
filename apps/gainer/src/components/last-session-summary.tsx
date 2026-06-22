import type { ExerciseType, SessionExerciseWithSets } from "@/lib/queries";
import type { gainerSessions } from "@jf/db";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toLocaleString("en-GB", { maximumFractionDigits: 2 })} km`
    : `${meters} m`;
}

function formatSet(set: SessionExerciseWithSets["sets"][number], type: ExerciseType): string {
  if (type === "pdc") return `${set.reps} reps`;
  if (type === "duration")
    return set.durationSeconds != null ? formatDuration(set.durationSeconds) : "—";
  if (type === "cardio") {
    const dist = set.distanceMeters != null ? formatDistance(set.distanceMeters) : "—";
    const dur = set.durationSeconds != null ? formatDuration(set.durationSeconds) : "—";
    return `${dist} in ${dur}`;
  }
  return `${set.weight} kg × ${set.reps}`;
}

function formatRelativeDate(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diffDays < 30) return rtf.format(-diffDays, "day");
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 8) return rtf.format(-diffWeeks, "week");
  const diffMonths = Math.floor(diffDays / 30);
  return rtf.format(-diffMonths, "month");
}

interface LastSessionSummaryProps {
  session: typeof gainerSessions.$inferSelect;
  exercisesWithSets: SessionExerciseWithSets[];
}

export function LastSessionSummary({ session, exercisesWithSets }: LastSessionSummaryProps) {
  const date = session.finishedAt ?? session.startedAt;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <p className="text-sm font-semibold text-(--grey-900)">{session.name}</p>
        <span className="text-xs text-(--grey-500)">{formatRelativeDate(date)}</span>
      </div>

      {exercisesWithSets.length === 0 ? (
        <p className="text-sm text-(--grey-500)">No exercises logged.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {exercisesWithSets.map((se) => (
            <div
              key={se.id}
              className="flex flex-col gap-1 p-4 rounded-xl bg-(--surface-100) border border-(--surface-200)"
            >
              <p className="text-sm font-semibold text-(--grey-900)">{se.exercise.name}</p>
              {se.sets.map((set) => (
                <p key={set.id} className="text-sm text-(--grey-600)">
                  Set {set.setNumber} — {formatSet(set, se.exercise.type)}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
