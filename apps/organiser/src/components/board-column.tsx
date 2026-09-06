"use client";

import type { CardRow, ColumnRow, TagRow } from "@/lib/queries";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TextInput, cn } from "@jf/ui";
import {
  CaretDownIcon,
  DotsSixVerticalIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { ColumnDeleteDialog, type DeleteColumnMode } from "./column-delete-dialog";
import { ColumnEditModal } from "./column-edit-modal";
import { SortableCard } from "./sortable-card";

export function BoardColumn({
  column,
  cards,
  isOnlyColumn,
  otherColumns,
  tagsForCard,
  onAddCard,
  onCardClick,
  onUpdate,
  onToggleCollapsed,
  onDelete,
}: {
  column: ColumnRow;
  cards: CardRow[];
  isOnlyColumn: boolean;
  otherColumns: { id: string; name: string }[];
  tagsForCard: (cardId: string) => TagRow[];
  onAddCard: (columnId: string, title: string) => Promise<void>;
  onCardClick: (card: CardRow) => void;
  onUpdate: (columnId: string, input: { name: string; color: string | null }) => Promise<void>;
  onToggleCollapsed: (columnId: string, collapsed: boolean) => void;
  onDelete: (columnId: string, mode: DeleteColumnMode) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: "column" },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitCard() {
    const trimmed = title.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    setSubmitting(true);
    try {
      await onAddCard(column.id, trimmed);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  if (column.collapsed) {
    return (
      <button
        type="button"
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onToggleCollapsed(column.id, false)}
        aria-label={`Expand ${column.name}`}
        className="flex min-w-[44px] max-w-[44px] flex-col items-center gap-2 rounded-[16px] bg-(--surface-150) py-3 snap-start touch-none sm:snap-align-none"
      >
        {column.color && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
        )}
        <span
          className="text-sm font-semibold text-(--grey-900)"
          style={{ writingMode: "vertical-rl" }}
        >
          {column.name}
        </span>
        <span className="text-xs text-(--grey-500)">{cards.length}</span>
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex max-h-full min-w-[85vw] max-w-[85vw] snap-start flex-col overflow-hidden rounded-[16px] bg-(--surface-150) sm:min-w-[280px] sm:max-w-[280px] sm:snap-align-none"
    >
      {column.color && <div className="h-1 w-full" style={{ backgroundColor: column.color }} />}

      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${column.name}`}
          className="flex h-7 w-6 cursor-grab items-center justify-center text-(--grey-400) hover:text-(--grey-700) touch-none"
        >
          <DotsSixVerticalIcon size={16} />
        </button>

        <h2 className="flex-1 truncate text-sm font-semibold text-(--grey-900)">{column.name}</h2>
        <span className="text-xs text-(--grey-500)">{cards.length}</span>

        <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label={`${column.name} options`}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] text-(--grey-700) hover:bg-(--surface-200)"
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
                className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) transition-colors hover:bg-(--surface-150)"
              >
                <PencilSimpleIcon size={16} /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onToggleCollapsed(column.id, true);
                }}
                className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-(--grey-900) transition-colors hover:bg-(--surface-150)"
              >
                <CaretDownIcon size={16} /> Collapse
              </button>
              <button
                type="button"
                disabled={isOnlyColumn}
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-sm text-(--red-500) transition-colors hover:bg-(--surface-150) disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrashIcon size={16} /> Delete
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              tags={tagsForCard(card.id)}
              onClick={() => onCardClick(card)}
            />
          ))}
        </SortableContext>
      </div>

      <div className="p-2">
        {adding ? (
          <TextInput
            value={title}
            onChange={setTitle}
            placeholder="Card title"
            autoFocus
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitCard();
              } else if (e.key === "Escape") {
                setTitle("");
                setAdding(false);
              }
            }}
            onBlur={() => {
              if (!title.trim()) setAdding(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "flex w-full items-center gap-1 rounded-[10px] px-2 py-2 text-sm text-(--grey-500)",
              "hover:bg-(--surface-200) hover:text-(--grey-800)"
            )}
          >
            <PlusIcon size={16} /> Add card
          </button>
        )}
      </div>

      <ColumnEditModal
        column={column}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={(input) => onUpdate(column.id, input)}
      />
      <ColumnDeleteDialog
        columnName={column.name}
        cardCount={cards.length}
        otherColumns={otherColumns}
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDelete={(mode) => onDelete(column.id, mode)}
      />
    </div>
  );
}
