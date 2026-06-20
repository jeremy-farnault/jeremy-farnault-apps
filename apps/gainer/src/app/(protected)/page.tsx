import { DataTab } from "@/components/data-tab";
import { LogTab } from "@/components/log-tab";
import { ViewToggle } from "@/components/view-toggle";
import {
  getActiveSession,
  getExercises,
  getLoggedExercises,
  getSessionExercisesWithSets,
} from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function GainerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = viewParam === "data" ? "data" : "log";

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const activeSession = view === "log" ? await getActiveSession(userId) : null;
  const [exercises, sessionExercisesWithSets] = activeSession
    ? await Promise.all([getExercises(userId), getSessionExercisesWithSets(activeSession.id)])
    : [[], []];

  const loggedExercises = view === "data" ? await getLoggedExercises(userId) : [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl px-4 py-6">
      <ViewToggle view={view} />
      {view === "log" && (
        <LogTab
          activeSession={activeSession}
          exercises={exercises}
          sessionExercisesWithSets={sessionExercisesWithSets}
        />
      )}
      {view === "data" && <DataTab exercises={loggedExercises} />}
    </div>
  );
}
