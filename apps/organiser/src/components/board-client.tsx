"use client";

import {
  createCardAction,
  createColumnAction,
  createTagAction,
  deleteCardAction,
  deleteColumnAction,
  deleteTagAction,
  moveCardAction,
  moveColumnAction,
  setColumnCollapsedAction,
  updateCardAction,
  updateColumnAction,
  updateTagAction,
} from "@/lib/actions";
import { keyBetween } from "@/lib/ordering";
import type { CardRow, ColumnRow, TagRow } from "@/lib/queries";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { TextInput, cn } from "@jf/ui";
import { extractPlainText } from "@jf/ui/rich-text";
import { PlusIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BoardColumn } from "./board-column";
import { BoardToolbar, type DeadlineBucket } from "./board-toolbar";
import { CardDetailModal } from "./card-detail-modal";
import { CardTile } from "./card-tile";
import type { DeleteColumnMode } from "./column-delete-dialog";
import { ManageTagsModal } from "./manage-tags-modal";

// Signed whole-day count from today to a date-only deadline (local day).
function daysUntilDeadline(deadline: string): number {
  const [y, m, d] = deadline.split("-").map(Number);
  const due = new Date(y as number, (m as number) - 1, d as number);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

export function BoardClient({
  boardId,
  columns: initialColumns,
  cards: initialCards,
  tags: initialTags,
  cardTagIds: initialCardTagIds,
}: {
  boardId: string;
  columns: ColumnRow[];
  cards: CardRow[];
  tags: TagRow[];
  cardTagIds: Record<string, string[]>;
}) {
  const [columns, setColumns] = useState<ColumnRow[]>(initialColumns);
  const [cards, setCards] = useState<CardRow[]>(initialCards);
  const [tags, setTags] = useState<TagRow[]>(initialTags);
  const [cardTagIds, setCardTagIds] = useState<Record<string, string[]>>(initialCardTagIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"card" | "column" | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [managingTags, setManagingTags] = useState(false);

  // ─── Transient search & filter view (not persisted) ───────────────
  const [search, setSearch] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [deadlineBucket, setDeadlineBucket] = useState<DeadlineBucket | null>(null);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0);

  const hasActiveFilters =
    search.trim() !== "" ||
    filterTagIds.length > 0 ||
    deadlineBucket !== null ||
    filterColor !== null;

  function clearFilters() {
    setSearch("");
    setFilterTagIds([]);
    setDeadlineBucket(null);
    setFilterColor(null);
    setSearchKey((k) => k + 1);
  }

  // ─── Edge fades for the horizontally-scrolling column row ──────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 1);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: columns/cards are triggers — a change to the set alters the scrollable width, so re-measure.
  useEffect(() => {
    updateScrollFades();
    window.addEventListener("resize", updateScrollFades);
    return () => window.removeEventListener("resize", updateScrollFades);
  }, [updateScrollFades, columns, cards]);

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  function tagsForCard(cardId: string): TagRow[] {
    return (cardTagIds[cardId] ?? [])
      .map((id) => tagsById.get(id))
      .filter((t): t is TagRow => Boolean(t));
  }

  function matchesFilters(card: CardRow): boolean {
    const query = search.trim().toLowerCase();
    if (query) {
      const haystack = `${card.title}\n${extractPlainText(card.body, 10_000)}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filterTagIds.length > 0) {
      const ids = cardTagIds[card.id] ?? [];
      if (!filterTagIds.some((id) => ids.includes(id))) return false;
    }

    if (deadlineBucket) {
      const days = card.deadline ? daysUntilDeadline(card.deadline) : null;
      if (deadlineBucket === "none" && card.deadline !== null) return false;
      if (deadlineBucket === "has-date" && card.deadline === null) return false;
      if (deadlineBucket === "overdue" && !(days !== null && days < 0)) return false;
      if (deadlineBucket === "due-soon" && !(days !== null && days >= 0 && days <= 7)) return false;
    }

    if (filterColor && card.color !== filterColor) return false;

    return true;
  }

  const tagUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ids of Object.values(cardTagIds)) {
      for (const id of ids) counts[id] = (counts[id] ?? 0) + 1;
    }
    return counts;
  }, [cardTagIds]);

  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const cardsSnapshotRef = useRef<CardRow[]>(cards);
  const columnsSnapshotRef = useRef<ColumnRow[]>(columns);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedColumns = [...columns].sort(byPosition);
  const columnIds = new Set(columns.map((c) => c.id));

  function cardsForColumn(list: CardRow[], columnId: string): CardRow[] {
    return list.filter((c) => c.columnId === columnId).sort(byPosition);
  }

  function resolveColumnId(overId: string, list: CardRow[]): string | undefined {
    if (columnIds.has(overId)) return overId;
    return list.find((c) => c.id === overId)?.columnId;
  }

  // ─── Card mutations ───────────────────────────────────────────────
  async function handleAddCard(columnId: string, title: string) {
    try {
      const created = await createCardAction({ columnId, title });
      setCards((prev) => [...prev, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleUpdateCard(
    cardId: string,
    input: {
      title: string;
      body: string | null;
      color: string | null;
      deadline: string | null;
      columnId: string;
      tagIds: string[];
    }
  ) {
    const updated = await updateCardAction({ cardId, ...input });
    setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
    setCardTagIds((prev) => ({ ...prev, [cardId]: input.tagIds }));
  }

  async function handleDeleteCard(cardId: string) {
    await deleteCardAction({ cardId });
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setCardTagIds((prev) => {
      const { [cardId]: _removed, ...rest } = prev;
      return rest;
    });
  }

  // ─── Tag mutations ────────────────────────────────────────────────
  async function handleCreateTag(name: string): Promise<TagRow> {
    const tag = await createTagAction({ name });
    setTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    return tag;
  }

  async function handleUpdateTag(tagId: string, input: { name: string; color: string }) {
    const updated = await updateTagAction({ tagId, ...input });
    setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
  }

  async function handleDeleteTag(tagId: string) {
    await deleteTagAction({ tagId });
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setCardTagIds((prev) => {
      const next: Record<string, string[]> = {};
      for (const [cardId, ids] of Object.entries(prev)) {
        next[cardId] = ids.filter((id) => id !== tagId);
      }
      return next;
    });
  }

  // ─── Column mutations ─────────────────────────────────────────────
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnName, setColumnName] = useState("");

  async function handleCreateColumn() {
    const name = columnName.trim();
    if (!name) {
      setAddingColumn(false);
      return;
    }
    try {
      const created = await createColumnAction({ boardId, name });
      setColumns((prev) => [...prev, created]);
      setColumnName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleUpdateColumn(
    columnId: string,
    input: { name: string; color: string | null }
  ) {
    await updateColumnAction({ columnId, name: input.name, color: input.color });
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, ...input } : c)));
  }

  function handleToggleCollapsed(columnId: string, collapsed: boolean) {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, collapsed } : c)));
    void setColumnCollapsedAction({ columnId, collapsed }).catch((err) => {
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, collapsed: !collapsed } : c))
      );
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    });
  }

  async function handleDeleteColumn(columnId: string, mode: DeleteColumnMode) {
    const { movedCards } = await deleteColumnAction(
      mode.mode === "move-cards"
        ? { columnId, mode: "move-cards", targetColumnId: mode.targetColumnId }
        : { columnId, mode: "delete-cards" }
    );
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCards((prev) => {
      const withoutColumn = prev.filter((c) => c.columnId !== columnId);
      if (movedCards.length === 0) return withoutColumn;
      const movedIds = new Set(movedCards.map((m) => m.id));
      return [...withoutColumn.filter((c) => !movedIds.has(c.id)), ...movedCards];
    });
  }

  // ─── Drag and drop ────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    cardsSnapshotRef.current = cardsRef.current;
    columnsSnapshotRef.current = columnsRef.current;
    setActiveId(String(event.active.id));
    setActiveType((event.active.data.current?.type as "card" | "column") ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    if (event.active.data.current?.type !== "card") return;
    const active = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    if (!over || over === active) return;

    setCards((prev) => {
      const activeCard = prev.find((c) => c.id === active);
      if (!activeCard) return prev;

      const targetColumnId = resolveColumnId(over, prev);
      if (!targetColumnId) return prev;

      const targetCards = cardsForColumn(prev, targetColumnId).filter((c) => c.id !== active);
      const index = columnIds.has(over)
        ? targetCards.length
        : targetCards.findIndex((c) => c.id === over);
      const insertAt = index === -1 ? targetCards.length : index;

      const before = targetCards[insertAt - 1] ?? null;
      const after = targetCards[insertAt] ?? null;

      if (activeCard.columnId === targetColumnId) {
        const gtBefore = before ? activeCard.position > before.position : true;
        const ltAfter = after ? activeCard.position < after.position : true;
        if (gtBefore && ltAfter) return prev;
      }

      const position = keyBetween(before?.position ?? null, after?.position ?? null);
      return prev.map((c) => (c.id === active ? { ...c, columnId: targetColumnId, position } : c));
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const type = event.active.data.current?.type;
    setActiveId(null);
    setActiveType(null);

    if (type === "column") {
      const activeColId = String(event.active.id);
      const overId = event.over ? String(event.over.id) : null;
      if (!overId) return;
      const overColId = columnsRef.current.some((c) => c.id === overId)
        ? overId
        : cardsRef.current.find((c) => c.id === overId)?.columnId;
      if (!overColId || overColId === activeColId) return;

      const ordered = [...columnsRef.current].sort(byPosition);
      const oldIndex = ordered.findIndex((c) => c.id === activeColId);
      const newIndex = ordered.findIndex((c) => c.id === overColId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(ordered, oldIndex, newIndex);
      const idx = reordered.findIndex((c) => c.id === activeColId);
      const before = reordered[idx - 1] ?? null;
      const after = reordered[idx + 1] ?? null;
      const position = keyBetween(before?.position ?? null, after?.position ?? null);

      setColumns((prev) => prev.map((c) => (c.id === activeColId ? { ...c, position } : c)));
      try {
        await moveColumnAction({ columnId: activeColId, position });
      } catch (err) {
        setColumns(columnsSnapshotRef.current);
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
      return;
    }

    // Card move — position already applied optimistically in onDragOver.
    const active = String(event.active.id);
    const moved = cardsRef.current.find((c) => c.id === active);
    if (!moved) return;
    try {
      await moveCardAction({
        cardId: moved.id,
        toColumnId: moved.columnId,
        position: moved.position,
      });
    } catch (err) {
      setCards(cardsSnapshotRef.current);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const activeCard =
    activeType === "card" && activeId ? (cards.find((c) => c.id === activeId) ?? null) : null;
  const activeColumn =
    activeType === "column" && activeId ? (columns.find((c) => c.id === activeId) ?? null) : null;
  const selectedCard = selectedCardId ? (cards.find((c) => c.id === selectedCardId) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <BoardToolbar
          searchKey={searchKey}
          onSearchChange={setSearch}
          allTags={tags}
          filterTagIds={filterTagIds}
          onToggleTag={(tagId) =>
            setFilterTagIds((prev) =>
              prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
            )
          }
          deadlineBucket={deadlineBucket}
          onDeadlineChange={setDeadlineBucket}
          filterColor={filterColor}
          onColorChange={setFilterColor}
          hasActiveFilters={hasActiveFilters}
          onClear={clearFilters}
          onManageTags={() => setManagingTags(true)}
        />

        <div className="relative flex min-h-0 w-full flex-1">
          <div
            ref={scrollRef}
            onScroll={updateScrollFades}
            className="flex h-full w-full snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-3 sm:snap-none"
          >
            <SortableContext
              items={orderedColumns.map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              {orderedColumns.map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  cards={cardsForColumn(cards, column.id).filter(matchesFilters)}
                  isOnlyColumn={columns.length <= 1}
                  otherColumns={orderedColumns
                    .filter((c) => c.id !== column.id)
                    .map((c) => ({ id: c.id, name: c.name }))}
                  tagsForCard={tagsForCard}
                  onAddCard={handleAddCard}
                  onCardClick={(card) => setSelectedCardId(card.id)}
                  onUpdate={handleUpdateColumn}
                  onToggleCollapsed={handleToggleCollapsed}
                  onDelete={handleDeleteColumn}
                />
              ))}
            </SortableContext>

            <div className="min-w-[85vw] max-w-[85vw] snap-start px-2 pb-2 sm:min-w-[280px] sm:max-w-[280px] sm:snap-align-none">
              {addingColumn ? (
                <TextInput
                  value={columnName}
                  onChange={setColumnName}
                  placeholder="Column name"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateColumn();
                    } else if (e.key === "Escape") {
                      setColumnName("");
                      setAddingColumn(false);
                    }
                  }}
                  onBlur={() => {
                    if (!columnName.trim()) setAddingColumn(false);
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-[16px] px-3 py-3 text-sm text-(--grey-500)",
                    "bg-(--surface-100) hover:bg-(--surface-150) hover:text-(--grey-800)"
                  )}
                >
                  <PlusIcon size={16} /> Add column
                </button>
              )}
            </div>
          </div>

          {/* Edge blur: columns dissolve into a light blur as they scroll off, like
              the aerospace landing calendar. Strongest at the edge, tapering inward. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-16 backdrop-blur-[3px] transition-opacity duration-300",
              "[mask-image:linear-gradient(to_right,black,transparent)] [-webkit-mask-image:linear-gradient(to_right,black,transparent)]",
              canScrollLeft ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-16 backdrop-blur-[3px] transition-opacity duration-300",
              "[mask-image:linear-gradient(to_left,black,transparent)] [-webkit-mask-image:linear-gradient(to_left,black,transparent)]",
              canScrollRight ? "opacity-100" : "opacity-0"
            )}
          />
        </div>
      </div>

      <DragOverlay>
        {activeCard ? (
          <CardTile card={activeCard} tags={tagsForCard(activeCard.id)} />
        ) : activeColumn ? (
          <div className="min-w-[85vw] max-w-[85vw] rounded-[16px] bg-(--surface-150) px-3 py-3 text-sm font-semibold text-(--grey-900) shadow-lg sm:min-w-[280px] sm:max-w-[280px]">
            {activeColumn.name}
          </div>
        ) : null}
      </DragOverlay>

      {selectedCard && (
        <CardDetailModal
          key={selectedCard.id}
          card={selectedCard}
          columns={orderedColumns.map((c) => ({ id: c.id, name: c.name }))}
          allTags={tags}
          initialTagIds={cardTagIds[selectedCard.id] ?? []}
          onClose={() => setSelectedCardId(null)}
          onSave={(input) => handleUpdateCard(selectedCard.id, input)}
          onCreateTag={handleCreateTag}
          onDelete={() => handleDeleteCard(selectedCard.id)}
        />
      )}

      <ManageTagsModal
        tags={tags}
        usage={tagUsage}
        isOpen={managingTags}
        onClose={() => setManagingTags(false)}
        onCreate={async (name) => {
          await handleCreateTag(name);
        }}
        onUpdate={handleUpdateTag}
        onDelete={handleDeleteTag}
      />
    </DndContext>
  );
}
