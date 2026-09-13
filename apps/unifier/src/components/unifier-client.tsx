"use client";

import {
  createArcAction,
  createPersonAction,
  createSlotAction,
  deleteArcAction,
  deleteSlotAction,
  logTouchAction,
  moveArcAction,
  movePersonAction,
  moveSlotAction,
  updateArcAction,
  updateSlotAction,
} from "@/lib/actions";
import type { ArcRow, PersonRow, SlotRow } from "@/lib/queries";
import { keyBetween } from "@jf/ui/ordering";
import { CirclesThreeIcon, ListIcon, TargetIcon, UserPlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { ArcCreateModal } from "./arc-create-modal";
import type { DeleteArcMode } from "./arc-delete-dialog";
import { ArcSection } from "./arc-section";
import { FirstRunEmptyState } from "./first-run-empty-state";
import { OrbitView } from "./orbit-view";
import { PersonCreateModal } from "./person-create-modal";

/** Lexicographic sort on a fractional-index `position` key. */
function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

type Props = {
  arcs: ArcRow[];
  persons: PersonRow[];
  slots: SlotRow[];
  lastTouchAt: Record<string, Date>;
};

export function UnifierClient({
  arcs: initialArcs,
  persons: initialPersons,
  slots: initialSlots,
  lastTouchAt: initialLastTouchAt,
}: Props) {
  const [arcs, setArcs] = useState<ArcRow[]>(initialArcs);
  const [persons, setPersons] = useState<PersonRow[]>(initialPersons);
  const [slots, setSlots] = useState<SlotRow[]>(initialSlots);
  const [lastTouchAt, setLastTouchAt] = useState<Record<string, Date>>(initialLastTouchAt);
  // The orbit is the weekly-review surface and the doc's landing view; the list stays
  // reachable because arc, slot and person management all live there.
  const [view, setView] = useState<"orbit" | "list">("orbit");
  const [arcModalOpen, setArcModalOpen] = useState(false);
  const [personModalOpen, setPersonModalOpen] = useState(false);

  // Order is re-derived on every render, so an appended or re-keyed row lands in place.
  const orderedArcs = [...arcs].sort(byPosition);

  function slotsForArc(arcId: string): SlotRow[] {
    return slots.filter((s) => s.arcId === arcId).sort(byPosition);
  }

  function peopleForArc(arcId: string): PersonRow[] {
    return persons.filter((p) => p.arcId === arcId).sort((a, b) => a.name.localeCompare(b.name));
  }

  async function handleCreateArc(input: { name: string; color: string | null }) {
    const created = await createArcAction(input);
    setArcs((prev) => [...prev, created]);
  }

  async function handleAddPerson(arcId: string, name: string) {
    const created = await createPersonAction({ arcId, name });
    setPersons((prev) => [...prev, created]);
  }

  async function handleUpdateArc(arcId: string, input: { name: string; color: string | null }) {
    const snapshot = arcs;
    setArcs((prev) => prev.map((a) => (a.id === arcId ? { ...a, ...input } : a)));
    try {
      await updateArcAction({ arcId, ...input });
    } catch (err) {
      setArcs(snapshot);
      throw err;
    }
  }

  /**
   * Swaps an arc with its neighbour by computing a key between the two rows on the far
   * side of that neighbour — one row changes, everything else stays put.
   */
  async function handleMoveArc(arcId: string, direction: "up" | "down") {
    const ordered = [...arcs].sort(byPosition);
    const i = ordered.findIndex((a) => a.id === arcId);
    if (i === -1) return;
    if (direction === "up" && i === 0) return;
    if (direction === "down" && i === ordered.length - 1) return;

    const position =
      direction === "up"
        ? keyBetween(ordered[i - 2]?.position ?? null, ordered[i - 1]?.position ?? null)
        : keyBetween(ordered[i + 1]?.position ?? null, ordered[i + 2]?.position ?? null);

    const snapshot = arcs;
    setArcs((prev) => prev.map((a) => (a.id === arcId ? { ...a, position } : a)));
    try {
      await moveArcAction({ arcId, position });
    } catch (err) {
      setArcs(snapshot);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleDeleteArc(arcId: string, mode: DeleteArcMode) {
    const { movedPersons } = await deleteArcAction(
      mode.mode === "move-people"
        ? { arcId, mode: "move-people", targetArcId: mode.targetArcId }
        : { arcId, mode: "delete-people" }
    );
    setArcs((prev) => prev.filter((a) => a.id !== arcId));
    setPersons((prev) => {
      const survivors = prev.filter((p) => p.arcId !== arcId);
      if (movedPersons.length === 0) return survivors;
      const movedIds = new Set(movedPersons.map((m) => m.id));
      return [...survivors.filter((p) => !movedIds.has(p.id)), ...movedPersons];
    });
  }

  async function handleAddSlot(arcId: string, label: string) {
    const created = await createSlotAction({ arcId, label });
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

  /** Swaps a slot with its neighbour inside its own arc — one row written. */
  async function handleMoveSlot(slotId: string, direction: "up" | "down") {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    const ordered = slotsForArc(slot.arcId);
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

  /** Logs a touch straight from the orbit, so the dot moves inward immediately. */
  async function handleOrbitLogTouch(personId: string) {
    const previous = lastTouchAt[personId];
    const stamp = new Date();
    setLastTouchAt((prev) => ({ ...prev, [personId]: stamp }));
    try {
      const created = await logTouchAction({ personId });
      setLastTouchAt((prev) => ({ ...prev, [personId]: created.occurredAt }));
    } catch (err) {
      setLastTouchAt((prev) => {
        const next = { ...prev };
        if (previous) next[personId] = previous;
        else delete next[personId];
        return next;
      });
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleMovePerson(personId: string, targetArcId: string) {
    const moved = await movePersonAction({ personId, targetArcId });
    setPersons((prev) => prev.map((p) => (p.id === personId ? moved : p)));
  }

  return (
    <main className="flex w-full flex-1 flex-col px-4 pb-32">
      {orderedArcs.length > 0 && (
        <div className="flex justify-center pt-2">
          <div className="flex gap-1 rounded-[12px] bg-(--surface-150) p-1">
            <button
              type="button"
              onClick={() => setView("orbit")}
              aria-pressed={view === "orbit"}
              className={
                view === "orbit"
                  ? "flex items-center gap-1.5 rounded-[9px] bg-(--card) px-3 py-1.5 text-sm font-medium text-(--grey-900)"
                  : "flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-sm text-(--grey-600) hover:text-(--grey-900)"
              }
            >
              <TargetIcon size={16} /> Orbit
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={
                view === "list"
                  ? "flex items-center gap-1.5 rounded-[9px] bg-(--card) px-3 py-1.5 text-sm font-medium text-(--grey-900)"
                  : "flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-sm text-(--grey-600) hover:text-(--grey-900)"
              }
            >
              <ListIcon size={16} /> List
            </button>
          </div>
        </div>
      )}

      {orderedArcs.length === 0 ? (
        <FirstRunEmptyState onCreateArc={() => setArcModalOpen(true)} />
      ) : view === "orbit" ? (
        <div className="py-4">
          <OrbitView
            arcs={orderedArcs}
            people={persons}
            lastTouchAt={lastTouchAt}
            onLogTouch={handleOrbitLogTouch}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-4">
          {orderedArcs.map((arc, i) => (
            <ArcSection
              key={arc.id}
              arc={arc}
              people={peopleForArc(arc.id)}
              slots={slotsForArc(arc.id)}
              otherArcs={orderedArcs
                .filter((a) => a.id !== arc.id)
                .map((a) => ({ id: a.id, name: a.name }))}
              isFirst={i === 0}
              isLast={i === orderedArcs.length - 1}
              onAddPerson={handleAddPerson}
              onUpdateArc={handleUpdateArc}
              onMoveArc={handleMoveArc}
              onDeleteArc={handleDeleteArc}
              onMovePerson={handleMovePerson}
              onAddSlot={handleAddSlot}
              onRenameSlot={handleRenameSlot}
              onMoveSlot={handleMoveSlot}
              onRemoveSlot={handleRemoveSlot}
            />
          ))}
        </div>
      )}

      {/* Floating CTAs: adding a person is the everyday action, so it takes the
          primary slot; creating an arc is the occasional one and sits beside it. */}
      {orderedArcs.length > 0 && (
        <div
          className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 gap-3"
          style={{ animation: "cta-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
        >
          <button
            type="button"
            onClick={() => setArcModalOpen(true)}
            aria-label="New arc"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-(--border) bg-(--card) text-(--grey-700) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--surface-150)"
          >
            <CirclesThreeIcon size={22} />
          </button>
          <button
            type="button"
            onClick={() => setPersonModalOpen(true)}
            aria-label="Add a person"
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-(--primary) text-(--primary-foreground) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)] hover:bg-(--secondary) hover:text-white"
          >
            <UserPlusIcon size={22} />
          </button>
        </div>
      )}

      <ArcCreateModal
        isOpen={arcModalOpen}
        onClose={() => setArcModalOpen(false)}
        onSubmit={handleCreateArc}
      />

      {personModalOpen && (
        <PersonCreateModal
          arcs={orderedArcs.map((a) => ({ id: a.id, name: a.name }))}
          isOpen
          onClose={() => setPersonModalOpen(false)}
          onSubmit={({ arcId, name }) => handleAddPerson(arcId, name)}
        />
      )}
    </main>
  );
}
