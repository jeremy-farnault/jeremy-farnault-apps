"use client";

import { ActionModal, Select, SelectItem } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";

export type DeleteColumnMode =
  | { mode: "delete-cards" }
  | { mode: "move-cards"; targetColumnId: string };

export function ColumnDeleteDialog({
  columnName,
  cardCount,
  otherColumns,
  isOpen,
  onClose,
  onDelete,
}: {
  columnName: string;
  cardCount: number;
  otherColumns: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (mode: DeleteColumnMode) => Promise<void>;
}) {
  const [choice, setChoice] = useState<"move" | "delete">("move");
  const [targetId, setTargetId] = useState<string>(otherColumns[0]?.id ?? "");
  const [deleting, setDeleting] = useState(false);

  const hasCards = cardCount > 0;

  async function handleDelete() {
    const payload: DeleteColumnMode =
      !hasCards || choice === "delete"
        ? { mode: "delete-cards" }
        : { mode: "move-cards", targetColumnId: targetId };
    if (payload.mode === "move-cards" && !payload.targetColumnId) {
      toast.error("Choose a column");
      return;
    }
    setDeleting(true);
    try {
      await onDelete(payload);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title={`Delete “${columnName}”?`}
      {...(hasCards ? {} : { paragraph: "This column is empty and will be removed." })}
      content={
        hasCards ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-(--grey-700)">
              This column has {cardCount} {cardCount === 1 ? "card" : "cards"}. Choose what happens
              to them.
            </p>
            <label className="flex items-center gap-2 text-sm text-(--grey-900)">
              <input
                type="radio"
                name="delete-mode"
                checked={choice === "move"}
                onChange={() => setChoice("move")}
              />
              Move cards to another column
            </label>
            {choice === "move" && (
              <Select value={targetId} onValueChange={setTargetId} placeholder="Choose a column">
                {otherColumns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </Select>
            )}
            <label className="flex items-center gap-2 text-sm text-(--grey-900)">
              <input
                type="radio"
                name="delete-mode"
                checked={choice === "delete"}
                onChange={() => setChoice("delete")}
              />
              Delete the cards too
            </label>
          </div>
        ) : null
      }
      primaryButton={{
        label: "Delete column",
        loading: deleting,
        disabled: hasCards && choice === "move" && !targetId,
        onClick: () => void handleDelete(),
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
