"use client";

import { ActionModal, Select, SelectItem } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";

export type DeleteArcMode =
  | { mode: "delete-people" }
  | { mode: "move-people"; targetArcId: string };

type Props = {
  arcName: string;
  personCount: number;
  otherArcs: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (mode: DeleteArcMode) => Promise<void>;
};

/**
 * Deleting an arc that still holds people always asks what happens to them. When no
 * other arc exists there is nowhere to move them, so only the explicit
 * "delete them too" path is offered — never a silent destruction.
 */
export function ArcDeleteDialog({
  arcName,
  personCount,
  otherArcs,
  isOpen,
  onClose,
  onDelete,
}: Props) {
  const [choice, setChoice] = useState<"move" | "delete">("move");
  const [targetId, setTargetId] = useState<string>(otherArcs[0]?.id ?? "");
  const [deleting, setDeleting] = useState(false);

  const hasPeople = personCount > 0;
  const canMove = otherArcs.length > 0;
  const people = `${personCount} ${personCount === 1 ? "person" : "people"}`;

  async function handleDelete() {
    const payload: DeleteArcMode =
      !hasPeople || !canMove || choice === "delete"
        ? { mode: "delete-people" }
        : { mode: "move-people", targetArcId: targetId };
    if (payload.mode === "move-people" && !payload.targetArcId) {
      toast.error("Choose an arc");
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
      title={`Delete “${arcName}”?`}
      {...(hasPeople ? {} : { paragraph: "This arc is empty and will be removed." })}
      content={
        hasPeople ? (
          <div className="flex flex-col gap-3">
            {canMove ? (
              <>
                <p className="text-sm text-(--grey-700)">
                  This arc has {people}. Choose what happens to them.
                </p>
                <label className="flex items-center gap-2 text-sm text-(--grey-900)">
                  <input
                    type="radio"
                    name="delete-arc-mode"
                    checked={choice === "move"}
                    onChange={() => setChoice("move")}
                  />
                  Move them to another arc
                </label>
                {choice === "move" && (
                  <Select value={targetId} onValueChange={setTargetId} placeholder="Choose an arc">
                    {otherArcs.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </Select>
                )}
                <label className="flex items-center gap-2 text-sm text-(--grey-900)">
                  <input
                    type="radio"
                    name="delete-arc-mode"
                    checked={choice === "delete"}
                    onChange={() => setChoice("delete")}
                  />
                  Delete them along with the arc
                </label>
              </>
            ) : (
              <p className="text-sm text-(--grey-700)">
                This is your only arc, so the {people} in it can’t be moved anywhere. Deleting it
                removes them too.
              </p>
            )}
          </div>
        ) : null
      }
      primaryButton={{
        label:
          hasPeople && (!canMove || choice === "delete")
            ? `Delete arc and ${people}`
            : "Delete arc",
        loading: deleting,
        disabled: hasPeople && canMove && choice === "move" && !targetId,
        onClick: () => void handleDelete(),
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
