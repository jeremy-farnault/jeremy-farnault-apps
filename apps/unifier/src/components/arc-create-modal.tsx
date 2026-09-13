"use client";

import { ActionModal, COLOR_PALETTE, ColorPicker, TextInput } from "@jf/ui";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; color: string | null }) => Promise<void>;
};

/**
 * Names and colours a new arc. Shared by the first-run empty state and the "New arc"
 * CTA. Colour is picked here rather than in a follow-up edit, because the colour is
 * what tells the arcs apart on the orbit.
 *
 * Enter is handled by ActionModal alone — adding a second handler on the input would
 * fire the submit twice and create two arcs.
 */
export function ArcCreateModal({ isOpen, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset between openings so a cancelled entry doesn't linger.
  useEffect(() => {
    if (isOpen) {
      setName("");
      setColor(null);
    }
  }, [isOpen]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: trimmed, color });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      title="New arc"
      paragraph="Group the people you care about — Family, Managers, Close Friends."
      size="small"
      content={
        <div className="flex flex-col gap-4">
          <TextInput value={name} onChange={setName} placeholder="Arc name" autoFocus />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-(--grey-500)">Colour</span>
              <button
                type="button"
                onClick={() => setColor(null)}
                className="text-xs text-(--grey-500) hover:text-(--grey-800)"
              >
                No colour
              </button>
            </div>
            <ColorPicker palette={COLOR_PALETTE} value={color} onChange={setColor} />
          </div>
        </div>
      }
      primaryButton={{
        label: "Create",
        onClick: () => void submit(),
        loading: submitting,
        disabled: !name.trim(),
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
