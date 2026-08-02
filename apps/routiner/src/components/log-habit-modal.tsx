"use client";

import { logHabitAction } from "@/lib/actions";
import type { Habit, HabitLog } from "@/lib/queries";
import { ActionModal, DatePicker, Switch, Textarea } from "@jf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
  targetDate: string;
  existingLog?: HabitLog;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LogHabitModal({ isOpen, onClose, habit, targetDate, existingLog }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(targetDate);
  const [value, setValue] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setDate(targetDate);
    setValue(existingLog?.value ?? (habit.type === "boolean" ? "true" : ""));
    setComment(existingLog?.comment ?? "");
  }, [isOpen, targetDate, existingLog, habit.type]);

  function handleSubmit() {
    startTransition(async () => {
      try {
        const trimmedComment = comment.trim();
        await logHabitAction({
          habitId: habit.id,
          date,
          value,
          ...(trimmedComment ? { comment: trimmedComment } : {}),
        });
        toast.success(existingLog ? "Log updated" : "Logged");
        router.refresh();
        onClose();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const isValueValid = habit.type === "boolean" || value.trim() !== "";

  const inputClass = "h-11 w-full rounded-[10px] bg-(--surface-150) px-3 text-sm outline-none";

  const content = (
    <div className="flex flex-col gap-4">
      <DatePicker
        value={date}
        onChange={setDate}
        minDate={habit.startDate}
        maxDate={todayIso()}
        accentColor={habit.color}
      />
      {habit.type === "boolean" && (
        <Switch
          checked={value === "true"}
          onCheckedChange={(checked) => setValue(checked ? "true" : "false")}
          label="Done"
        />
      )}
      {habit.type === "numeric" && (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter value"
          className={inputClass}
        />
      )}
      {habit.type === "time" && (
        <input
          type="time"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
      )}
      <Textarea placeholder="Comment (optional)" value={comment} onChange={setComment} />
    </div>
  );

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title={existingLog ? "Edit log" : "Log habit"}
      content={content}
      primaryButton={{
        label: existingLog ? "Save" : "Log",
        loading: isPending,
        disabled: !isValueValid,
        onClick: handleSubmit,
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}
