"use client";

import type { ColumnRow } from "@/lib/queries";
import { ActionModal, COLOR_PALETTE, ColorPicker, TextInput } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";

export function ColumnEditModal({
  column,
  isOpen,
  onClose,
  onSave,
}: {
  column: ColumnRow;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: { name: string; color: string | null }) => Promise<void>;
}) {
  const [name, setName] = useState(column.name);
  const [color, setColor] = useState<string | null>(column.color);
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
      title="Edit column"
      content={
        <div className="flex flex-col gap-4">
          <TextInput value={name} onChange={setName} placeholder="Column name" autoFocus />
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
