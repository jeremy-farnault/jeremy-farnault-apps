import type { LoggedExercise } from "@/lib/queries";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

interface DataTabProps {
  exercises: LoggedExercise[];
}

export function DataTab({ exercises }: DataTabProps) {
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-(--grey-600) text-sm">
          No exercises logged yet. Start a session to begin tracking.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {exercises.map((exercise) => (
        <li key={exercise.id} className="rounded-[12px] bg-(--surface-100)">
          <Link
            href={`/exercise/${exercise.id}`}
            className="px-4 py-3 flex items-center justify-between hover:bg-(--surface-150) rounded-[12px] transition-colors"
          >
            <span className="text-sm font-medium text-(--grey-900)">{exercise.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-(--grey-500)">
                {exercise.lastLoggedAt.toLocaleDateString("en-GB", { dateStyle: "long" })}
              </span>
              <CaretRightIcon size={14} className="text-(--grey-400)" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
