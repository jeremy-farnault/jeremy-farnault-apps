import { ExerciseProgressChart } from "@/components/exercise-progress-chart";
import { getExerciseWithSets } from "@/lib/queries";
import { auth } from "@jf/auth";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-(--surface-100) p-3 flex flex-col gap-1">
      <span className="text-xs text-(--grey-500)">{label}</span>
      <span className="text-sm font-semibold text-(--grey-900)">{value}</span>
    </div>
  );
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const result = await getExerciseWithSets(userId, id);
  if (!result) notFound();

  const { exercise, sets } = result;

  const totalVolume = sets.reduce((s, r) => s + Number.parseFloat(r.weight) * r.reps, 0);
  const maxWeight = Math.max(...sets.map((r) => Number.parseFloat(r.weight)));
  const maxReps = Math.max(...sets.map((r) => r.reps));

  const sessionMap = new Map<string, { date: Date; name: string; maxWeight: number }>();
  for (const row of sets) {
    const w = Number.parseFloat(row.weight);
    const cur = sessionMap.get(row.sessionId);
    if (!cur || w > cur.maxWeight) {
      sessionMap.set(row.sessionId, { date: row.sessionDate, name: row.sessionName, maxWeight: w });
    }
  }
  const chartData = [...sessionMap.values()].sort((a, b) => +a.date - +b.date);

  type SessionGroup = {
    id: string;
    name: string;
    date: Date;
    sets: { setNumber: number; weight: string; reps: number }[];
  };
  const sessionGroupMap = new Map<string, SessionGroup>();
  for (const row of sets) {
    if (!sessionGroupMap.has(row.sessionId)) {
      sessionGroupMap.set(row.sessionId, {
        id: row.sessionId,
        name: row.sessionName,
        date: row.sessionDate,
        sets: [],
      });
    }
    sessionGroupMap.get(row.sessionId)?.sets.push({
      setNumber: row.setNumber,
      weight: row.weight,
      reps: row.reps,
    });
  }
  const sessionGroups = [...sessionGroupMap.values()].reverse();

  return (
    <div className="w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      <Link
        href="/?view=data"
        className="inline-flex items-center gap-1 text-sm text-(--grey-500) hover:text-(--grey-900) transition-colors w-fit"
      >
        <CaretLeftIcon size={14} />
        Exercises
      </Link>

      <h1 className="text-lg font-semibold text-(--grey-900)">{exercise.name}</h1>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Total volume"
          value={`${totalVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 })} kg`}
        />
        <StatCard label="Max weight" value={`${maxWeight} kg`} />
        <StatCard label="Max reps" value={String(maxReps)} />
      </div>

      {chartData.length > 1 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-(--grey-600)">Max weight per session</h2>
          <ExerciseProgressChart data={chartData} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-(--grey-600)">Set log</h2>
        {sessionGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-1">
            <p className="text-xs text-(--grey-500)">
              {group.name} — {group.date.toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
            {group.sets.map((set) => (
              <p key={set.setNumber} className="text-sm text-(--grey-700) pl-2">
                Set {set.setNumber} — {set.weight} kg × {set.reps}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
