"use client";

import { setSymptomLogAction } from "@/lib/actions";
import { formatDateLabel } from "@/lib/cycle";
import type { Symptom } from "@/lib/queries";
import { ActionModal, Textarea, cn } from "@jf/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  symptoms: Symptom[];
  initialSymptomIds: string[];
  initialNote: string | null;
};

export function DayDetailModal({
  isOpen,
  onClose,
  date,
  symptoms,
  initialSymptomIds,
  initialNote,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSymptomIds);
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(initialSymptomIds);
    setNote(initialNote ?? "");
  }, [isOpen, initialSymptomIds, initialNote]);

  function toggleSymptom(symptomId: string) {
    setSelectedIds((prev) =>
      prev.includes(symptomId) ? prev.filter((id) => id !== symptomId) : [...prev, symptomId]
    );
  }

  function handleSubmit() {
    startTransition(async () => {
      try {
        await setSymptomLogAction({ date, symptomIds: selectedIds, note: note.trim() || null });
        toast.success("Saved");
        router.refresh();
        onClose();
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const content = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {symptoms.map((symptom) => {
          const selected = selectedIds.includes(symptom.id);
          return (
            <button
              key={symptom.id}
              type="button"
              onClick={() => toggleSymptom(symptom.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "bg-(--grey-800) text-white"
                  : "bg-(--surface-150) text-(--grey-700) hover:bg-(--surface-200)"
              )}
            >
              {symptom.name}
            </button>
          );
        })}
      </div>

      <Textarea placeholder="Note (optional)" value={note} onChange={setNote} />
    </div>
  );

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title={formatDateLabel(date)}
      content={content}
      primaryButton={{ label: "Save", loading: isPending, onClick: handleSubmit }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
      closeOnBackdropClick={!isPending}
      closeOnEscapeKeyDown={!isPending}
    />
  );
}
