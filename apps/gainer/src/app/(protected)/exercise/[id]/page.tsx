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

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
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
  const type = exercise.type;

  // ── Per-type stats ────────────────────────────────────────────────────────

  type ChartPoint = { date: Date; value: number };

  let statCards: { label: string; value: string }[] = [];
  let chartData: ChartPoint[] = [];
  let chartType: "weight" | "reps" | "duration" | "pace" = "weight";
  let chartValueLabel = "";

  if (type === "standard") {
    const totalVolume = sets.reduce(
      (s, r) => s + Number.parseFloat(r.weight ?? "0") * (r.reps ?? 0),
      0
    );
    const maxWeight = Math.max(...sets.map((r) => Number.parseFloat(r.weight ?? "0")));
    const maxReps = Math.max(...sets.map((r) => r.reps ?? 0));

    statCards = [
      {
        label: "Total volume",
        value: `${totalVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 })} kg`,
      },
      { label: "Max weight", value: `${maxWeight} kg` },
      { label: "Max reps", value: String(maxReps) },
    ];

    const sessionMap = new Map<string, { date: Date; name: string; maxWeight: number }>();
    for (const row of sets) {
      const w = Number.parseFloat(row.weight ?? "0");
      const cur = sessionMap.get(row.sessionId);
      if (!cur || w > cur.maxWeight) {
        sessionMap.set(row.sessionId, {
          date: row.sessionDate,
          name: row.sessionName,
          maxWeight: w,
        });
      }
    }
    chartData = [...sessionMap.values()]
      .sort((a, b) => +a.date - +b.date)
      .map((d) => ({ date: d.date, value: d.maxWeight }));
    chartType = "weight";
    chartValueLabel = "Max weight";
  } else if (type === "pdc") {
    const totalReps = sets.reduce((s, r) => s + (r.reps ?? 0), 0);
    const maxReps = Math.max(...sets.map((r) => r.reps ?? 0));

    statCards = [
      { label: "Total reps", value: String(totalReps) },
      { label: "Max reps", value: String(maxReps) },
    ];

    const sessionMap = new Map<string, { date: Date; maxReps: number }>();
    for (const row of sets) {
      const reps = row.reps ?? 0;
      const cur = sessionMap.get(row.sessionId);
      if (!cur || reps > cur.maxReps) {
        sessionMap.set(row.sessionId, { date: row.sessionDate, maxReps: reps });
      }
    }
    chartData = [...sessionMap.values()]
      .sort((a, b) => +a.date - +b.date)
      .map((d) => ({ date: d.date, value: d.maxReps }));
    chartType = "reps";
    chartValueLabel = "Max reps";
  } else if (type === "duration") {
    const validSets = sets.filter((r) => r.durationSeconds != null);
    const totalSeconds = validSets.reduce((s, r) => s + (r.durationSeconds ?? 0), 0);
    const bestSeconds = Math.max(...validSets.map((r) => r.durationSeconds ?? 0));

    statCards = [
      { label: "Total time", value: formatDuration(totalSeconds) },
      { label: "Best effort", value: formatDuration(bestSeconds) },
    ];

    const sessionMap = new Map<string, { date: Date; best: number }>();
    for (const row of validSets) {
      const dur = row.durationSeconds ?? 0;
      const cur = sessionMap.get(row.sessionId);
      if (!cur || dur > cur.best) {
        sessionMap.set(row.sessionId, { date: row.sessionDate, best: dur });
      }
    }
    chartData = [...sessionMap.values()]
      .sort((a, b) => +a.date - +b.date)
      .map((d) => ({ date: d.date, value: d.best }));
    chartType = "duration";
    chartValueLabel = "Best duration";
  } else {
    // cardio
    const validSets = sets.filter((r) => r.distanceMeters != null && r.durationSeconds != null);
    const totalMeters = validSets.reduce((s, r) => s + (r.distanceMeters ?? 0), 0);
    const bestMeters = Math.max(...validSets.map((r) => r.distanceMeters ?? 0));
    const bestPaceSeconds = Math.min(
      ...validSets.map((r) => ((r.durationSeconds ?? 0) / (r.distanceMeters ?? 1)) * 1000)
    );

    statCards = [
      { label: "Total distance", value: formatDistance(totalMeters) },
      { label: "Best distance", value: formatDistance(bestMeters) },
      { label: "Best pace", value: formatPace(bestPaceSeconds) },
    ];

    const sessionMap = new Map<string, { date: Date; bestPace: number }>();
    for (const row of validSets) {
      const pace = ((row.durationSeconds ?? 0) / (row.distanceMeters ?? 1)) * 1000;
      const cur = sessionMap.get(row.sessionId);
      if (!cur || pace < cur.bestPace) {
        sessionMap.set(row.sessionId, { date: row.sessionDate, bestPace: pace });
      }
    }
    chartData = [...sessionMap.values()]
      .sort((a, b) => +a.date - +b.date)
      .map((d) => ({ date: d.date, value: d.bestPace }));
    chartType = "pace";
    chartValueLabel = "Best pace";
  }

  // ── Session log ───────────────────────────────────────────────────────────

  type SessionGroupRaw = { id: string; date: Date; sets: typeof sets };
  type SessionGroup = SessionGroupRaw & { sessionStats: { label: string; value: string }[] };
  const sessionGroupMap = new Map<string, SessionGroupRaw>();
  for (const row of sets) {
    if (!sessionGroupMap.has(row.sessionId)) {
      sessionGroupMap.set(row.sessionId, {
        id: row.sessionId,
        date: row.sessionDate,
        sets: [],
      });
    }
    sessionGroupMap.get(row.sessionId)?.sets.push(row);
  }
  const sessionGroups: SessionGroup[] = [...sessionGroupMap.values()].reverse().map((group) => {
    let sessionStats: { label: string; value: string }[] = [];
    if (type === "standard") {
      const volume = group.sets.reduce(
        (s, r) => s + Number.parseFloat(r.weight ?? "0") * (r.reps ?? 0),
        0
      );
      const maxW = Math.max(...group.sets.map((r) => Number.parseFloat(r.weight ?? "0")));
      const maxR = Math.max(...group.sets.map((r) => r.reps ?? 0));
      sessionStats = [
        {
          label: "Volume",
          value: `${volume.toLocaleString("en-GB", { maximumFractionDigits: 0 })} kg`,
        },
        { label: "Max weight", value: `${maxW} kg` },
        { label: "Max reps", value: String(maxR) },
      ];
    } else if (type === "pdc") {
      const totalReps = group.sets.reduce((s, r) => s + (r.reps ?? 0), 0);
      const maxR = Math.max(...group.sets.map((r) => r.reps ?? 0));
      sessionStats = [
        { label: "Total reps", value: String(totalReps) },
        { label: "Max reps", value: String(maxR) },
      ];
    } else if (type === "duration") {
      const valid = group.sets.filter((r) => r.durationSeconds != null);
      const total = valid.reduce((s, r) => s + (r.durationSeconds ?? 0), 0);
      const best = Math.max(...valid.map((r) => r.durationSeconds ?? 0));
      sessionStats = [
        { label: "Total time", value: formatDuration(total) },
        { label: "Best", value: formatDuration(best) },
      ];
    } else {
      const valid = group.sets.filter((r) => r.distanceMeters != null && r.durationSeconds != null);
      const totalM = valid.reduce((s, r) => s + (r.distanceMeters ?? 0), 0);
      const bestM = Math.max(...valid.map((r) => r.distanceMeters ?? 0));
      sessionStats = [
        { label: "Total dist.", value: formatDistance(totalM) },
        { label: "Best dist.", value: formatDistance(bestM) },
      ];
    }
    return { ...group, sessionStats };
  });

  function formatSetSummary(set: (typeof sets)[number]): string {
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

      <div className={`grid gap-3 ${statCards.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {statCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      {chartData.length > 1 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-(--grey-600)">{chartValueLabel} per session</h2>
          <ExerciseProgressChart
            data={chartData}
            chartType={chartType}
            valueLabel={chartValueLabel}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-(--grey-600)">Set log</h2>
        {sessionGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2">
            <p className="text-xs text-(--grey-500)">
              {group.date.toLocaleDateString("en-GB", { dateStyle: "long" })}
            </p>
            <div className="flex gap-3 items-start">
              <div className="flex flex-col gap-1 flex-1">
                {group.sets.map((set) => (
                  <p key={set.setNumber} className="text-sm text-(--grey-700) pl-2">
                    Set {set.setNumber} — {formatSetSummary(set)}
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                {group.sessionStats.map((stat) => (
                  <div key={stat.label} className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-(--grey-900)">{stat.value}</span>
                    <span className="text-[10px] text-(--grey-400)">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
