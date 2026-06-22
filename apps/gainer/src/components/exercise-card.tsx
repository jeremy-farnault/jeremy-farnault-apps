"use client";

import { logSet } from "@/lib/actions";
import type { ExerciseType, LastSessionSummary, SessionExerciseWithSets } from "@/lib/queries";
import { Button, TextInput } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface ExerciseCardProps {
  data: SessionExerciseWithSets;
  lastSession?: LastSessionSummary;
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

function SetDisplay({
  set,
  exerciseType,
}: {
  set: SessionExerciseWithSets["sets"][number];
  exerciseType: ExerciseType;
}) {
  let summary: string;
  if (exerciseType === "pdc") {
    summary = `${set.reps} reps`;
  } else if (exerciseType === "duration") {
    summary = set.durationSeconds != null ? formatDuration(set.durationSeconds) : "—";
  } else if (exerciseType === "cardio") {
    const dist = set.distanceMeters != null ? formatDistance(set.distanceMeters) : "—";
    const dur = set.durationSeconds != null ? formatDuration(set.durationSeconds) : "—";
    summary = `${dist} in ${dur}`;
  } else {
    summary = `${set.weight} kg × ${set.reps}`;
  }
  return (
    <p className="text-sm text-(--grey-600)">
      Set {set.setNumber} — {summary}
    </p>
  );
}

function formatLastSession(last: LastSessionSummary, type: ExerciseType): string {
  if (type === "standard") {
    const weight = last.maxWeight != null ? `${last.maxWeight} kg` : null;
    const reps = last.maxReps != null ? `${last.maxReps}` : null;
    if (weight && reps) return `${weight} × ${reps}`;
    if (weight) return weight;
    if (reps) return `${reps} reps`;
  } else if (type === "pdc") {
    if (last.maxReps != null) return `${last.maxReps} reps`;
  } else if (type === "duration") {
    if (last.maxDurationSeconds != null) return formatDuration(last.maxDurationSeconds);
  } else if (type === "cardio") {
    const dist = last.maxDistanceMeters != null ? formatDistance(last.maxDistanceMeters) : null;
    const dur = last.maxDurationSeconds != null ? formatDuration(last.maxDurationSeconds) : null;
    if (dist && dur) return `${dist} in ${dur}`;
    if (dist) return dist;
    if (dur) return dur;
  }
  return "";
}

export function ExerciseCard({ data, lastSession }: ExerciseCardProps) {
  const exerciseType = data.exercise.type;
  const [isPending, startTransition] = useTransition();

  // Standard
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  // Duration / Cardio
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  // Cardio distance
  const [distanceKm, setDistanceKm] = useState("");

  function handleLog() {
    if (exerciseType === "standard") {
      const weightNum = Number.parseFloat(weight);
      const repsNum = Number.parseInt(reps, 10);
      if (!weight || Number.isNaN(weightNum) || weightNum <= 0) {
        toast.error("Enter a valid weight");
        return;
      }
      if (!reps || Number.isNaN(repsNum) || repsNum <= 0 || !Number.isInteger(repsNum)) {
        toast.error("Enter a valid rep count");
        return;
      }
      startTransition(async () => {
        try {
          await logSet(data.id, { weight, reps: repsNum });
          setWeight("");
          setReps("");
        } catch {
          toast.error("Failed to log set");
        }
      });
    } else if (exerciseType === "pdc") {
      const repsNum = Number.parseInt(reps, 10);
      if (!reps || Number.isNaN(repsNum) || repsNum <= 0 || !Number.isInteger(repsNum)) {
        toast.error("Enter a valid rep count");
        return;
      }
      startTransition(async () => {
        try {
          await logSet(data.id, { reps: repsNum });
          setReps("");
        } catch {
          toast.error("Failed to log set");
        }
      });
    } else if (exerciseType === "duration") {
      const min = Number.parseInt(minutes || "0", 10);
      const sec = Number.parseInt(seconds || "0", 10);
      if (Number.isNaN(min) || Number.isNaN(sec) || (min === 0 && sec === 0)) {
        toast.error("Enter a valid duration");
        return;
      }
      const durationSeconds = min * 60 + sec;
      startTransition(async () => {
        try {
          await logSet(data.id, { durationSeconds });
          setMinutes("");
          setSeconds("");
        } catch {
          toast.error("Failed to log set");
        }
      });
    } else {
      // cardio
      const km = Number.parseFloat(distanceKm);
      const min = Number.parseInt(minutes || "0", 10);
      const sec = Number.parseInt(seconds || "0", 10);
      if (!distanceKm || Number.isNaN(km) || km <= 0) {
        toast.error("Enter a valid distance");
        return;
      }
      if (Number.isNaN(min) || Number.isNaN(sec) || (min === 0 && sec === 0)) {
        toast.error("Enter a valid duration");
        return;
      }
      const distanceMeters = Math.round(km * 1000);
      const durationSeconds = min * 60 + sec;
      startTransition(async () => {
        try {
          await logSet(data.id, { distanceMeters, durationSeconds });
          setDistanceKm("");
          setMinutes("");
          setSeconds("");
        } catch {
          toast.error("Failed to log set");
        }
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-(--surface-100) border border-(--surface-200)">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-(--grey-900)">{data.exercise.name}</p>
        {lastSession && (
          <p className="text-xs text-(--grey-500)">
            Last · {formatLastSession(lastSession, exerciseType)}
          </p>
        )}
      </div>

      {data.sets.length > 0 && (
        <div className="flex flex-col gap-1">
          {data.sets.map((set) => (
            <SetDisplay key={set.id} set={set} exerciseType={exerciseType} />
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        {exerciseType === "standard" && (
          <>
            <TextInput
              placeholder="Weight (kg)"
              value={weight}
              onChange={(value) => setWeight(value)}
            />
            <TextInput placeholder="Reps" value={reps} onChange={(value) => setReps(value)} />
          </>
        )}
        {exerciseType === "pdc" && (
          <TextInput placeholder="Reps" value={reps} onChange={(value) => setReps(value)} />
        )}
        {(exerciseType === "duration" || exerciseType === "cardio") && (
          <>
            {exerciseType === "cardio" && (
              <TextInput
                placeholder="km"
                value={distanceKm}
                onChange={(value) => setDistanceKm(value)}
              />
            )}
            <TextInput placeholder="Min" value={minutes} onChange={(value) => setMinutes(value)} />
            <TextInput placeholder="Sec" value={seconds} onChange={(value) => setSeconds(value)} />
          </>
        )}
        <Button onClick={handleLog} disabled={isPending}>
          {isPending ? "Logging…" : "Log set"}
        </Button>
      </div>
    </div>
  );
}
