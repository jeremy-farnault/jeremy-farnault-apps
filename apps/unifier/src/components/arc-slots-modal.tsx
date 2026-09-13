"use client";

import type { SlotRow } from "@/lib/queries";
import { ActionModal, Button, TextInput } from "@jf/ui";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  arcName: string;
  slots: SlotRow[];
  isOpen: boolean;
  onClose: () => void;
  onAdd: (label: string) => Promise<void>;
  onRename: (slotId: string, label: string) => Promise<void>;
  onMove: (slotId: string, direction: "up" | "down") => Promise<void>;
  onRemove: (slotId: string) => Promise<void>;
};

const ICON_BUTTON =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-(--grey-500) transition-[color,background-color,transform] hover:bg-(--surface-200) hover:text-(--grey-900) active:scale-90 disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Edits an arc's slot template. Slots are defined once here and inherited by every
 * person in the arc, so a change lands across all of them at once.
 */
export function ArcSlotsModal({
  arcName,
  slots,
  isOpen,
  onClose,
  onAdd,
  onRename,
  onMove,
  onRemove,
}: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = newLabel.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    try {
      await onAdd(trimmed);
      setNewLabel("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      title={`Slots for ${arcName}`}
      paragraph="Everyone in this arc carries these fields, in this order."
      content={
        <div className="flex flex-col gap-3">
          {slots.length === 0 ? (
            <p className="text-sm text-(--grey-500)">
              No slots yet. Add one — a birthday, their kids, a career goal.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {slots.map((slot, i) => (
                <li key={slot.id} className="flex items-center gap-1.5">
                  <SlotLabelInput slot={slot} onRename={(label) => onRename(slot.id, label)} />
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => void onMove(slot.id, "up")}
                    aria-label={`Move ${slot.label} up`}
                    className={ICON_BUTTON}
                  >
                    <ArrowUpIcon size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={i === slots.length - 1}
                    onClick={() => void onMove(slot.id, "down")}
                    aria-label={`Move ${slot.label} down`}
                    className={ICON_BUTTON}
                  >
                    <ArrowDownIcon size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Two-step: removing a slot also removes everyone's value for it.
                      if (pendingRemove === slot.id) {
                        void onRemove(slot.id);
                        setPendingRemove(null);
                      } else {
                        setPendingRemove(slot.id);
                      }
                    }}
                    onBlur={() => setPendingRemove(null)}
                    aria-label={
                      pendingRemove === slot.id
                        ? `Confirm removing ${slot.label} and every value for it`
                        : `Remove ${slot.label}`
                    }
                    className={
                      pendingRemove === slot.id
                        ? "flex h-11 shrink-0 items-center rounded-[8px] bg-(--red-500) px-2.5 text-xs font-medium text-white active:scale-95"
                        : `${ICON_BUTTON} hover:text-(--red-500)`
                    }
                  >
                    {pendingRemove === slot.id ? "Sure?" : <TrashIcon size={14} />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 border-t border-(--grey-200) pt-3">
            <TextInput
              value={newLabel}
              onChange={setNewLabel}
              placeholder="New slot label"
              disabled={adding}
              onKeyDown={(e) => {
                // Enter adds the slot and stops there — left to bubble, ActionModal
                // would also fire its primary button and close the modal.
                if (e.key === "Enter") {
                  e.stopPropagation();
                  void handleAdd();
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => void handleAdd()}
              disabled={!newLabel.trim() || adding}
              aria-label="Add slot"
            >
              <PlusIcon size={16} />
            </Button>
          </div>
        </div>
      }
      primaryButton={{ label: "Done", onClick: onClose }}
    />
  );
}

/** A slot label committed on blur or Enter, reverting on failure. */
function SlotLabelInput({
  slot,
  onRename,
}: {
  slot: SlotRow;
  onRename: (label: string) => Promise<void>;
}) {
  const [label, setLabel] = useState(slot.label);

  async function commit() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === slot.label) {
      setLabel(slot.label);
      return;
    }
    try {
      await onRename(trimmed);
    } catch (err) {
      setLabel(slot.label);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <TextInput
      value={label}
      onChange={setLabel}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setLabel(slot.label);
      }}
      className="flex-1"
    />
  );
}
