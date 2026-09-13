"use client";

import {
  logTouchAction,
  setPersonImportantAction,
  setSlotValueAction,
  updatePersonNoteAction,
} from "@/lib/actions";
import { formatDrift, lastTouchAt } from "@/lib/drift";
import type { ArcRow, PersonRow, SlotRow, TouchRow } from "@/lib/queries";
import { TextInput, Textarea } from "@jf/ui";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
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
  slots,
  values: initialValues,
  touches: initialTouches,
}: Props) {
  const [values, setValues] = useState<Record<string, string | null>>(initialValues);
  const [touches, setTouches] = useState<TouchRow[]>(initialTouches);
  const [person, setPerson] = useState<PersonRow>(initialPerson);
  const [note, setNote] = useState(initialPerson.note ?? "");
  const [savedNote, setSavedNote] = useState(initialPerson.note ?? "");

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
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: arc.color ?? "var(--primary)" }}
          aria-hidden
        />
        <h1 className="min-w-0 break-words text-2xl font-semibold text-(--grey-900)">
          {person.name}
        </h1>
        <span className="text-sm text-(--grey-500)">{arc.name}</span>
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
        {slots.length === 0 ? (
          <p className="text-sm text-(--grey-500)">
            No slots on {arc.name} yet. Add some from the arc’s menu and they’ll appear here for
            everyone in it.
          </p>
        ) : (
          <dl className="flex flex-col gap-2.5">
            {slots.map((slot) => (
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
