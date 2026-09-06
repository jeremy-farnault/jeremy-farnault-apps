"use client";

import { createCardAction } from "@/lib/actions";
import type { CardRow, ColumnRow } from "@/lib/queries";
import { useState } from "react";
import { toast } from "sonner";
import { BoardColumn } from "./board-column";

export function BoardClient({
  columns,
  cards: initialCards,
}: {
  columns: ColumnRow[];
  cards: CardRow[];
}) {
  const [cards, setCards] = useState<CardRow[]>(initialCards);

  async function handleAddCard(columnId: string, title: string) {
    try {
      const created = await createCardAction({ columnId, title });
      setCards((prev) => [...prev, created]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function cardsForColumn(columnId: string): CardRow[] {
    return cards
      .filter((c) => c.columnId === columnId)
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  }

  return (
    <div className="flex min-h-0 w-full flex-1 gap-4 overflow-x-auto px-4 pb-4 pt-4">
      {columns.map((column) => (
        <BoardColumn
          key={column.id}
          column={column}
          cards={cardsForColumn(column.id)}
          onAddCard={handleAddCard}
        />
      ))}
    </div>
  );
}
