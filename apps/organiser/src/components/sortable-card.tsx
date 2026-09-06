"use client";

import type { CardRow, TagRow } from "@/lib/queries";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CardTile } from "./card-tile";

export function SortableCard({
  card,
  tags,
  onClick,
}: {
  card: CardRow;
  tags: TagRow[];
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
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
      <CardTile card={card} tags={tags} {...(onClick ? { onClick } : {})} />
    </div>
  );
}
