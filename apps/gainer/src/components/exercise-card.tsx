"use client";

import { logSet } from "@/lib/actions";
import type { SessionExerciseWithSets } from "@/lib/queries";
import { Button, TextInput } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface ExerciseCardProps {
  data: SessionExerciseWithSets;
}

export function ExerciseCard({ data }: ExerciseCardProps) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleLog() {
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
        await logSet(data.id, weight, repsNum);
        setWeight("");
        setReps("");
      } catch {
        toast.error("Failed to log set");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-(--surface-100) border border-(--surface-200)">
      <p className="text-sm font-semibold text-(--grey-900)">{data.exercise.name}</p>

      {data.sets.length > 0 && (
        <div className="flex flex-col gap-1">
          {data.sets.map((set) => (
            <p key={set.id} className="text-sm text-(--grey-600)">
              Set {set.setNumber} — {set.weight} kg × {set.reps}
            </p>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <TextInput
          placeholder="Weight (kg)"
          value={weight}
          onChange={(value) => setWeight(value)}
        />
        <TextInput placeholder="Reps" value={reps} onChange={(value) => setReps(value)} />
        <Button onClick={handleLog} disabled={isPending}>
          {isPending ? "Logging…" : "Log set"}
        </Button>
      </div>
    </div>
  );
}
