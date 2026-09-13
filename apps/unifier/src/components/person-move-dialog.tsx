"use client";

import { ActionModal, Select, SelectItem } from "@jf/ui";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  personName: string;
  otherArcs: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetArcId: string) => Promise<void>;
};

/** Moves a person into another arc; they pick up the destination arc's slots. */
export function PersonMoveDialog({ personName, otherArcs, isOpen, onClose, onMove }: Props) {
  const [targetId, setTargetId] = useState<string>(otherArcs[0]?.id ?? "");
  const [moving, setMoving] = useState(false);

  async function handleMove() {
    if (!targetId) {
      toast.error("Choose an arc");
      return;
    }
    setMoving(true);
    try {
      await onMove(targetId);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMoving(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title={`Move ${personName}`}
      paragraph="They'll pick up the destination arc's slots."
      content={
        <Select value={targetId} onValueChange={setTargetId} placeholder="Choose an arc">
          {otherArcs.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </Select>
      }
      primaryButton={{
        label: "Move",
        loading: moving,
        disabled: !targetId,
        onClick: () => void handleMove(),
      }}
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
