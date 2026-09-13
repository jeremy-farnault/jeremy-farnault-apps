"use client";

import type { ArcRow } from "@/lib/queries";
import { ActionModal, COLOR_PALETTE, ColorPicker, TextInput } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  arc: ArcRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { name: string; color: string | null }) => Promise<void>;
};

/** Renames and recolours an arc. Colour comes from the shared palette. */
export function ArcEditModal({ arc, isOpen, onClose, onSave }: Props) {
  const [name, setName] = useState(arc.name);
  const [color, setColor] = useState<string | null>(arc.color);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: trimmed, color });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title="Edit arc"
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
      primaryButton={{ label: "Save", loading: saving, onClick: () => void handleSave() }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
