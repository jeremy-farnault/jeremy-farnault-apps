"use client";

import type { CardRow, TagRow } from "@/lib/queries";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardTile } from "./card-tile";

export function SortableCard({
  card,
  tags,
  isDoneColumn = false,
  onClick,
}: {
  card: CardRow;
  tags: TagRow[];
  isDoneColumn?: boolean;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card" },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation"
    >
      <CardTile
        card={card}
        tags={tags}
        isDoneColumn={isDoneColumn}
        {...(onClick ? { onClick } : {})}
      />
    </div>
  );
}
