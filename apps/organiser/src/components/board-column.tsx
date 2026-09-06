"use client";

import type { CardRow, ColumnRow } from "@/lib/queries";
import { TextInput, cn } from "@jf/ui";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CardTile } from "./card-tile";

export function BoardColumn({
  column,
  cards,
  onAddCard,
}: {
  column: ColumnRow;
  cards: CardRow[];
  onAddCard: (columnId: string, title: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
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

  return (
    <div className="flex max-h-full min-w-[280px] max-w-[280px] flex-col rounded-[16px] bg-(--surface-150)">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-sm font-semibold text-(--grey-900)">{column.name}</h2>
        <span className="text-xs text-(--grey-500)">{cards.length}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2">
        {cards.map((card) => (
          <CardTile key={card.id} card={card} />
        ))}
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
                void submit();
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
    </div>
  );
}
