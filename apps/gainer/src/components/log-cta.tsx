"use client";

import { addExerciseToSession } from "@/lib/actions";
import type { gainerExercises } from "@jf/db";
import { ActionModal, TextInput } from "@jf/ui";
import { PlusSquareIcon, TimerIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PRESETS = [60, 90, 120, 180];
const DEFAULT_PRESET = 90;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

interface LogCtaProps {
  sessionId: string;
  exercises: (typeof gainerExercises.$inferSelect)[];
}

export function LogCta({ sessionId, exercises }: LogCtaProps) {
  // Timer state
  const [timerPickerOpen, setTimerPickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(DEFAULT_PRESET);
  const [customInput, setCustomInput] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise state
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [exerciseStep, setExerciseStep] = useState<"search" | "type">("search");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [isNewExercise, setIsNewExercise] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState<
    "standard" | "pdc" | "duration" | "cardio"
  >("standard");
  const [isExercisePending, setIsExercisePending] = useState(false);

  const selectedDuration = customInput ? Number.parseInt(customInput, 10) : selectedPreset;

  // Timer helpers
  function startTimer(seconds: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(seconds);
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(id);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = id;
  }

  function cancelTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRemaining(null);
  }

  function handleTimerConfirm() {
    startTimer(selectedDuration);
    setTimerPickerOpen(false);
    setCustomInput("");
  }

  function handleTimerClose() {
    setTimerPickerOpen(false);
    setCustomInput("");
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      toast.info("Rest over!");
      const id = setTimeout(() => setRemaining(null), 3000);
      return () => clearTimeout(id);
    }
  }, [remaining]);

  // Exercise helpers
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  const hasExactMatch = exercises.some((e) => e.name.toLowerCase() === query.toLowerCase());
  const showCustomOption = query.trim().length > 0 && !hasExactMatch;

  function handleExerciseClose() {
    setExercisePickerOpen(false);
    setExerciseStep("search");
    setQuery("");
    setSelected("");
    setIsNewExercise(false);
    setNewExerciseType("standard");
  }

  function handleSelectCustom() {
    setSelected(query.trim());
    setIsNewExercise(true);
    setExerciseStep("type");
  }

  async function handleExerciseConfirm() {
    if (!selected) return;
    if (isNewExercise && exerciseStep === "search") {
      setExerciseStep("type");
      return;
    }
    setIsExercisePending(true);
    try {
      await addExerciseToSession(sessionId, selected, isNewExercise ? newExerciseType : undefined);
      handleExerciseClose();
    } catch {
      toast.error("Failed to add exercise");
    } finally {
      setIsExercisePending(false);
    }
  }

  return (
    <>
      {/* Dual floating CTAs (idle) or countdown pill (running) */}
      {remaining !== null ? (
        <div
          className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 h-14 px-6 rounded-xl bg-(--primary) text-white shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]"
          style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <span className="text-sm font-semibold tabular-nums">
            {remaining === 0 ? "Done!" : formatTime(remaining)}
          </span>
          {remaining > 0 && (
            <button
              type="button"
              onClick={cancelTimer}
              className="text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
          style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <button
            type="button"
            onClick={() => setTimerPickerOpen(true)}
            aria-label="Rest timer"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
          >
            <TimerIcon size={22} />
          </button>
          <button
            type="button"
            onClick={() => setExercisePickerOpen(true)}
            aria-label="Add exercise"
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
          >
            <PlusSquareIcon size={22} />
          </button>
        </div>
      )}

      {/* Rest timer modal */}
      <ActionModal
        isOpen={timerPickerOpen}
        onClose={handleTimerClose}
        title="Rest timer"
        size="large"
        primaryButton={{
          label: "Start",
          onClick: handleTimerConfirm,
          disabled: !selectedDuration || selectedDuration <= 0 || Number.isNaN(selectedDuration),
        }}
        secondaryButton={{ label: "Cancel", onClick: handleTimerClose }}
        closeOnBackdropClick
        closeOnEscapeKeyDown
        content={
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset);
                    setCustomInput("");
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    selectedPreset === preset && !customInput
                      ? "bg-(--primary) text-white"
                      : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)"
                  }`}
                >
                  {formatTime(preset)}
                </button>
              ))}
            </div>
            <TextInput
              placeholder="Custom (s)"
              value={customInput}
              onChange={(value) => {
                setCustomInput(value);
                setSelectedPreset(0);
              }}
            />
          </div>
        }
      />

      {/* Add exercise modal */}
      <ActionModal
        isOpen={exercisePickerOpen}
        onClose={handleExerciseClose}
        title={exerciseStep === "type" ? `Type for "${selected}"` : "Add exercise"}
        size="large"
        primaryButton={{
          label: exerciseStep === "type" ? "Add" : "Add",
          loading: isExercisePending,
          onClick: handleExerciseConfirm,
          disabled: exerciseStep === "search" ? !selected : false,
        }}
        secondaryButton={{
          label: exerciseStep === "type" ? "Back" : "Cancel",
          onClick:
            exerciseStep === "type"
              ? () => {
                  setExerciseStep("search");
                  setIsNewExercise(false);
                }
              : handleExerciseClose,
        }}
        closeOnBackdropClick={!isExercisePending}
        closeOnEscapeKeyDown={!isExercisePending}
        content={
          exerciseStep === "search" ? (
            <div className="flex flex-col gap-3">
              <TextInput
                placeholder="Search exercises…"
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setSelected("");
                  setIsNewExercise(false);
                }}
              />
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                {filtered.map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    onClick={() => {
                      setSelected(exercise.name);
                      setIsNewExercise(false);
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      selected === exercise.name && !isNewExercise
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
                    onClick={handleSelectCustom}
                    className="text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer hover:bg-(--surface-150) text-(--grey-600)"
                  >
                    Add &quot;{query.trim()}&quot; as custom
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(
                [
                  { value: "standard", label: "Standard", description: "Weight + reps" },
                  { value: "pdc", label: "Bodyweight", description: "Reps only" },
                  { value: "duration", label: "Duration", description: "Time only" },
                  { value: "cardio", label: "Cardio", description: "Distance + time" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewExerciseType(opt.value)}
                  className={`text-left px-3 py-3 rounded-lg text-sm transition-colors cursor-pointer ${
                    newExerciseType === opt.value
                      ? "bg-(--primary) text-white"
                      : "bg-(--surface-150) hover:bg-(--surface-200) text-(--grey-900)"
                  }`}
                >
                  <span className="font-medium">{opt.label}</span>
                  <span
                    className={`ml-2 text-xs ${newExerciseType === opt.value ? "text-white/70" : "text-(--grey-500)"}`}
                  >
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          )
        }
      />
    </>
  );
}
