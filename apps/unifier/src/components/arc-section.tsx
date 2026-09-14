"use client";

import type { ArcRow, PersonRow, SlotRow } from "@/lib/queries";
import { TextInput, cn } from "@jf/ui";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsLeftRightIcon,
  DotsThreeIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArcDeleteDialog, type DeleteArcMode } from "./arc-delete-dialog";
import { ArcEditModal } from "./arc-edit-modal";
import { ArcSlotsModal } from "./arc-slots-modal";
import { PersonBubble } from "./person-bubble";
import { PersonMoveDialog } from "./person-move-dialog";

type Props = {
  arc: ArcRow;
  people: PersonRow[];
  slots: SlotRow[];
  otherArcs: { id: string; name: string }[];
  isFirst: boolean;
  isLast: boolean;
  onAddPerson: (arcId: string, name: string) => Promise<void>;
  onUpdateArc: (arcId: string, input: { name: string; color: string | null }) => Promise<void>;
  onMoveArc: (arcId: string, direction: "up" | "down") => Promise<void>;
  onDeleteArc: (arcId: string, mode: DeleteArcMode) => Promise<void>;
  onMovePerson: (personId: string, targetArcId: string) => Promise<void>;
  onEditPerson: (person: PersonRow) => void;
  onAddSlot: (arcId: string, label: string) => Promise<void>;
  onRenameSlot: (slotId: string, label: string) => Promise<void>;
  onMoveSlot: (slotId: string, direction: "up" | "down") => Promise<void>;
  onRemoveSlot: (slotId: string) => Promise<void>;
};

const MENU_ITEM =
  "flex min-h-11 items-center gap-2 rounded-[10px] px-3 text-left text-sm transition-colors hover:bg-(--surface-150) disabled:cursor-not-allowed disabled:opacity-40";

/** One arc: its name, the people in it, and the controls to manage both. */
export function ArcSection({
  arc,
  people,
  slots,
  otherArcs,
  isFirst,
  isLast,
  onAddPerson,
  onUpdateArc,
  onMoveArc,
  onDeleteArc,
  onMovePerson,
  onEditPerson,
  onAddSlot,
  onRenameSlot,
  onMoveSlot,
  onRemoveSlot,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [movingPerson, setMovingPerson] = useState<PersonRow | null>(null);

  const dotColor = arc.color ?? "var(--primary)";

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    setSubmitting(true);
    try {
      await onAddPerson(arc.id, trimmed);
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-(--surface-150) p-5">
      <div className="flex items-center gap-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
          aria-hidden
        />
        <h2 className="flex-1 truncate text-base font-semibold text-(--grey-900)">{arc.name}</h2>
        <span className="text-xs text-(--grey-500)">{people.length}</span>

        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`${arc.name} options`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-(--grey-700) transition-transform hover:bg-(--surface-200) active:scale-90"
            >
              <DotsThreeIcon size={18} weight="bold" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={4}
              className={cn(
                "z-50 flex flex-col rounded-[14px] bg-(--card) p-1",
                "shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] outline-none"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setEditOpen(true);
                }}
                className={cn(MENU_ITEM, "text-(--grey-900)")}
              >
                <PencilSimpleIcon size={16} /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setSlotsOpen(true);
                }}
                className={cn(MENU_ITEM, "text-(--grey-900)")}
              >
                <ListBulletsIcon size={16} /> Slots
                {slots.length > 0 && (
                  <span className="text-xs text-(--grey-500)">{slots.length}</span>
                )}
              </button>
              <button
                type="button"
                disabled={isFirst}
                onClick={() => {
                  setMenuOpen(false);
                  void onMoveArc(arc.id, "up");
                }}
                className={cn(MENU_ITEM, "text-(--grey-900)")}
              >
                <ArrowUpIcon size={16} /> Move up
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={() => {
                  setMenuOpen(false);
                  void onMoveArc(arc.id, "down");
                }}
                className={cn(MENU_ITEM, "text-(--grey-900)")}
              >
                <ArrowDownIcon size={16} /> Move down
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className={cn(MENU_ITEM, "text-(--red-500)")}
              >
                <TrashIcon size={16} /> Delete
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {people.length === 0 && !adding ? (
        <p className="text-sm text-(--grey-500)">No one here yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {people.map((person) => (
            <li
              key={person.id}
              className="group flex min-h-11 items-center gap-2 rounded-[10px] px-2 text-sm text-(--grey-800)"
            >
              <Link
                href={`/people/${person.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] transition-colors hover:text-(--grey-900)"
              >
                <PersonBubble
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  color={person.color}
                  arcColor={arc.color}
                  size={24}
                />
                <span className="truncate hover:underline">{person.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => onEditPerson(person)}
                aria-label={`Edit ${person.name}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-(--grey-400) transition-[color,background-color,transform] hover:bg-(--surface-200) hover:text-(--grey-800) active:scale-90"
              >
                <PencilSimpleIcon size={14} />
              </button>
              {otherArcs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMovingPerson(person)}
                  aria-label={`Move ${person.name} to another arc`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-(--grey-400) transition-[color,background-color,transform] hover:bg-(--surface-200) hover:text-(--grey-800) active:scale-90"
                >
                  <ArrowsLeftRightIcon size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <TextInput
          value={name}
          onChange={setName}
          placeholder="Name"
          autoFocus
          disabled={submitting}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") {
              setName("");
              setAdding(false);
            }
          }}
          onBlur={() => void submit()}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex min-h-11 items-center gap-1.5 self-start rounded-[10px] px-2 text-sm text-(--grey-600) transition-colors hover:bg-(--surface-200) hover:text-(--grey-900)"
        >
          <PlusIcon size={14} />
          {people.length === 0 ? "Add the first person" : "Add a person"}
        </button>
      )}

      {/* Mounted only while open: each dialog seeds its draft state from props at
          mount, so this is what keeps a reopened dialog in sync after an edit. */}
      {editOpen && (
        <ArcEditModal
          arc={arc}
          isOpen
          onClose={() => setEditOpen(false)}
          onSave={(input) => onUpdateArc(arc.id, input)}
        />
      )}
      {deleteOpen && (
        <ArcDeleteDialog
          arcName={arc.name}
          personCount={people.length}
          otherArcs={otherArcs}
          isOpen
          onClose={() => setDeleteOpen(false)}
          onDelete={(mode) => onDeleteArc(arc.id, mode)}
        />
      )}
      {slotsOpen && (
        <ArcSlotsModal
          arcName={arc.name}
          slots={slots}
          isOpen
          onClose={() => setSlotsOpen(false)}
          onAdd={(label) => onAddSlot(arc.id, label)}
          onRename={onRenameSlot}
          onMove={onMoveSlot}
          onRemove={onRemoveSlot}
        />
      )}
      {movingPerson && (
        <PersonMoveDialog
          key={movingPerson.id}
          personName={movingPerson.name}
          otherArcs={otherArcs}
          isOpen
          onClose={() => setMovingPerson(null)}
          onMove={(targetArcId) => onMovePerson(movingPerson.id, targetArcId)}
        />
      )}
    </section>
  );
}
