import type { CardRow } from "@/lib/queries";

export function CardTile({ card }: { card: CardRow }) {
  return (
    <div className="rounded-[12px] bg-(--card) p-3 text-sm text-(--card-foreground) shadow-sm">
      {card.title}
    </div>
  );
}
