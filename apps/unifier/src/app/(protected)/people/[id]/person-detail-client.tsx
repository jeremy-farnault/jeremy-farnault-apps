"use client";

import { ArcSlotsModal } from "@/components/arc-slots-modal";
import { PersonBubble } from "@/components/person-bubble";
import { PersonFormModal } from "@/components/person-form-modal";
import { PlainButton } from "@/components/plain-button";
import {
  createSlotAction,
  deletePersonAction,
  deleteSlotAction,
  logTouchAction,
  moveSlotAction,
  setPersonImportantAction,
  setSlotValueAction,
  updatePersonAction,
  updatePersonNoteAction,
  updateSlotAction,
} from "@/lib/actions";
import { formatDrift, lastTouchAt } from "@/lib/drift";
import type { ArcRow, PersonRow, SlotRow, TouchRow } from "@/lib/queries";
import { TextInput, Textarea } from "@jf/ui";
import { keyBetween } from "@jf/ui/ordering";
import { ArrowLeftIcon, PencilSimpleIcon, SlidersHorizontalIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CriticalFlag } from "./critical-flag";
import { TouchFeed } from "./touch-feed";

type Props = {
  person: PersonRow;
  arc: ArcRow;
  slots: SlotRow[];
  values: Record<string, string | null>;
  touches: TouchRow[];
};

export function PersonDetailClient({
  person: initialPerson,
  arc,
  slots: initialSlots,
  values: initialValues,
  touches: initialTouches,
}: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string | null>>(initialValues);
  // The template is editable from here too: with no slots there is nothing to fill in,
  // and sending the user back to the arc list just to define one is a dead end.
  const [slots, setSlots] = useState<SlotRow[]>(initialSlots);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [touches, setTouches] = useState<TouchRow[]>(initialTouches);
  const [person, setPerson] = useState<PersonRow>(initialPerson);
  const [note, setNote] = useState(initialPerson.note ?? "");
  const [savedNote, setSavedNote] = useState(initialPerson.note ?? "");

  // Re-derived on every render, so a moved or appended slot lands in template order.
  const orderedSlots = [...slots].sort((a, b) =>
    a.position < b.position ? -1 : a.position > b.position ? 1 : 0
  );

  // Drift is derived here, on every render, from the touch list in state — so logging a
  // touch moves it immediately. Nothing about staleness is stored.
  const drift = formatDrift(lastTouchAt(touches), new Date());
  const neverTouched = touches.length === 0;

  async function handleSaveValue(slotId: string, value: string) {
    const previous = values[slotId] ?? null;
    const next = value.trim() === "" ? null : value.trim();
    if (next === previous) return;
    setValues((prev) => ({ ...prev, [slotId]: next }));
    try {
      await setSlotValueAction({ personId: person.id, slotId, value });
    } catch (err) {
      setValues((prev) => ({ ...prev, [slotId]: previous }));
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  /**
   * The arc picker stays out of this modal: moving someone between arcs re-bases their
   * slot values, which belongs with the arc list where the consequence is visible.
   */
  async function handleUpdatePerson(values: {
    name: string;
    color: string | null;
    avatarKey: string | null;
  }) {
    const updated = await updatePersonAction({
      personId: person.id,
      arcId: arc.id,
      ...values,
    });
    setPerson(updated);
  }

  async function handleDeletePerson() {
    await deletePersonAction({ personId: person.id });
    router.push("/");
  }

  async function handleAddSlot(label: string) {
    const created = await createSlotAction({ arcId: arc.id, label });
    setSlots((prev) => [...prev, created]);
  }

  async function handleRenameSlot(slotId: string, label: string) {
    const snapshot = slots;
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, label } : s)));
    try {
      await updateSlotAction({ slotId, label });
    } catch (err) {
      setSlots(snapshot);
      throw err;
    }
  }

  /** Swaps a slot with its neighbour — one row written, same as the arc list does. */
  async function handleMoveSlot(slotId: string, direction: "up" | "down") {
    const ordered = [...slots].sort((a, b) =>
      a.position < b.position ? -1 : a.position > b.position ? 1 : 0
    );
    const i = ordered.findIndex((s) => s.id === slotId);
    if (i === -1) return;
    if (direction === "up" && i === 0) return;
    if (direction === "down" && i === ordered.length - 1) return;

    const position =
      direction === "up"
        ? keyBetween(ordered[i - 2]?.position ?? null, ordered[i - 1]?.position ?? null)
        : keyBetween(ordered[i + 1]?.position ?? null, ordered[i + 2]?.position ?? null);

    const snapshot = slots;
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, position } : s)));
    try {
      await moveSlotAction({ slotId, position });
    } catch (err) {
      setSlots(snapshot);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleRemoveSlot(slotId: string) {
    const snapshot = slots;
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    try {
      await deleteSlotAction({ slotId });
    } catch (err) {
      setSlots(snapshot);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleSaveNote() {
    const trimmed = note.trim();
    if (trimmed === savedNote) return;
    const previous = savedNote;
    setSavedNote(trimmed);
    try {
      await updatePersonNoteAction({ personId: person.id, note: trimmed });
    } catch (err) {
      setSavedNote(previous);
      setNote(previous);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleToggleImportant(important: boolean) {
    const previous = person;
    // Optimistic: flagging has to feel instant, and `flaggedAt` is reconciled from the
    // row the server returns so the displayed age is always the stored one.
    setPerson((prev) => ({
      ...prev,
      important,
      flaggedAt: important ? (prev.flaggedAt ?? new Date()) : null,
    }));
    try {
      const updated = await setPersonImportantAction({ personId: person.id, important });
      setPerson(updated);
    } catch (err) {
      setPerson(previous);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleLogTouch(touchNote?: string) {
    try {
      const created = await logTouchAction(
        touchNote ? { personId: person.id, note: touchNote } : { personId: person.id }
      );
      setTouches((prev) => [created, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 self-start text-sm text-(--grey-600) transition-colors hover:text-(--grey-900)"
      >
        <ArrowLeftIcon size={16} /> All arcs
      </Link>

      <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <PersonBubble
          name={person.name}
          avatarUrl={person.avatarUrl}
          color={person.color}
          arcColor={arc.color}
          size={40}
        />
        <h1 className="min-w-0 break-words text-2xl font-semibold text-(--grey-900)">
          {person.name}
        </h1>
        <span className="text-sm text-(--grey-500)">{arc.name}</span>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label={`Edit ${person.name}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-(--grey-400) transition-[color,background-color] hover:bg-(--surface-150) hover:text-(--grey-900)"
        >
          <PencilSimpleIcon size={16} />
        </button>
        <span
          className={
            neverTouched
              ? "shrink-0 rounded-full bg-(--surface-200) px-2.5 py-1 text-xs font-medium text-(--red-500) sm:ml-auto"
              : "shrink-0 rounded-full bg-(--surface-200) px-2.5 py-1 text-xs font-medium text-(--grey-700) sm:ml-auto"
          }
        >
          {drift}
        </span>
      </header>

      <CriticalFlag
        important={person.important}
        flaggedAt={person.flaggedAt}
        onToggle={handleToggleImportant}
      />

      {/* The glance layer. Every slot in the arc's template renders for every person,
          in template order, blank ones included — that fixed order and fixed set is
          what lets the same field be scanned down a whole arc. */}
      <section className="flex flex-col gap-2 rounded-[22px] bg-(--surface-150) p-5">
        {orderedSlots.length === 0 ? (
          <PlainButton
            onClick={() => setSlotsOpen(true)}
            className="self-start bg-(--surface-200) hover:bg-(--surface-300)"
          >
            <SlidersHorizontalIcon size={16} /> Add slots to {arc.name}
          </PlainButton>
        ) : (
          <dl className="flex flex-col gap-2.5">
            {orderedSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"
              >
                <dt className="shrink-0 break-words text-xs text-(--grey-500) sm:w-32 sm:text-sm">
                  {slot.label}
                </dt>
                <dd className="flex-1">
                  <SlotValueInput
                    key={slot.id}
                    initial={values[slot.id] ?? ""}
                    label={slot.label}
                    onSave={(value) => handleSaveValue(slot.id, value)}
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-(--grey-500)">Note</h2>
        <Textarea
          value={note}
          onChange={setNote}
          onBlur={() => void handleSaveNote()}
          placeholder="Anything that doesn’t fit a slot."
          rows={4}
        />
      </section>

      <TouchFeed touches={touches} onLogTouch={handleLogTouch} />

      {editOpen && (
        <PersonFormModal
          arcs={[{ id: arc.id, name: arc.name, color: arc.color }]}
          person={person}
          isOpen
          onClose={() => setEditOpen(false)}
          onSubmit={({ name: newName, color, avatarKey }) =>
            handleUpdatePerson({ name: newName, color, avatarKey })
          }
          onDelete={handleDeletePerson}
        />
      )}

      {slotsOpen && (
        <ArcSlotsModal
          arcName={arc.name}
          slots={orderedSlots}
          isOpen
          onClose={() => setSlotsOpen(false)}
          onAdd={handleAddSlot}
          onRename={handleRenameSlot}
          onMove={handleMoveSlot}
          onRemove={handleRemoveSlot}
        />
      )}
    </main>
  );
}

/** One slot's value, committed on blur or Enter. Empty renders empty, never nagging. */
function SlotValueInput({
  initial,
  label,
  onSave,
}: {
  initial: string;
  label: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initial);

  return (
    <TextInput
      value={value}
      onChange={setValue}
      placeholder="—"
      onBlur={() => void onSave(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setValue(initial);
      }}
      name={label}
    />
  );
}
