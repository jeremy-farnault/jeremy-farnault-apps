"use client";

import { addExerciseToSession } from "@/lib/actions";
import type { gainerExercises } from "@jf/db";
import { ActionModal, Button, TextInput } from "@jf/ui";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface AddExerciseCtaProps {
  sessionId: string;
  exercises: (typeof gainerExercises.$inferSelect)[];
}

export function AddExerciseCta({ sessionId, exercises }: AddExerciseCtaProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  const hasExactMatch = exercises.some((e) => e.name.toLowerCase() === query.toLowerCase());
  const showCustomOption = query.trim().length > 0 && !hasExactMatch;

  function handleClose() {
    if (isPending) return;
    setModalOpen(false);
    setQuery("");
    setSelected("");
  }

  function handleConfirm() {
    if (!selected) return;
    startTransition(async () => {
      try {
        await addExerciseToSession(sessionId, selected);
        handleClose();
      } catch {
        toast.error("Failed to add exercise");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setModalOpen(true)}>
        Add exercise
      </Button>
      <ActionModal
        isOpen={modalOpen}
        onClose={handleClose}
        title="Add exercise"
        size="large"
        primaryButton={{
          label: "Add",
          loading: isPending,
          onClick: handleConfirm,
          disabled: !selected,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: handleClose,
        }}
        closeOnBackdropClick={!isPending}
        closeOnEscapeKeyDown={!isPending}
        content={
          <div className="flex flex-col gap-3">
            <TextInput
              placeholder="Search exercises…"
              value={query}
              onChange={(value) => {
                setQuery(value);
                setSelected("");
              }}
            />
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {filtered.map((exercise) => (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() => setSelected(exercise.name)}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selected === exercise.name
                      ? "bg-(--primary) text-white"
                      : "hover:bg-(--surface-150) text-(--grey-900)"
                  }`}
                >
                  {exercise.name}
                </button>
              ))}
              {showCustomOption && (
                <button
                  type="button"
                  onClick={() => setSelected(query.trim())}
                  className={`text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    selected === query.trim()
                      ? "bg-(--primary) text-white"
                      : "hover:bg-(--surface-150) text-(--grey-600)"
                  }`}
                >
                  Add &quot;{query.trim()}&quot; as custom
                </button>
              )}
            </div>
          </div>
        }
      />
    </>
  );
}
