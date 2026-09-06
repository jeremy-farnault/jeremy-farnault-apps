import type { CardRow, TagRow } from "@/lib/queries";
import { cn, getColorForeground } from "@jf/ui";
import { extractPlainText } from "@jf/ui/rich-text";
import { TextAlignLeftIcon } from "@phosphor-icons/react";

// Signed whole-day count from today to the deadline, date-only against the local day.
function daysUntil(deadline: string): number {
  const [y, m, d] = deadline.split("-").map(Number);
  const due = new Date(y as number, (m as number) - 1, d as number);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function CardTile({
  card,
  tags = [],
  onClick,
}: {
  card: CardRow;
  tags?: TagRow[];
  onClick?: () => void;
}) {
  const preview = extractPlainText(card.body, 120).trim();
  const hasBody = preview.length > 0;
  const days = card.deadline ? daysUntil(card.deadline) : null;

  return (
    <div
      {...(onClick ? { onClick, role: "button", tabIndex: 0 } : {})}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-[12px] bg-(--card) p-3 pl-4 text-sm text-(--card-foreground) shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-(--blue-600)",
        onClick && "cursor-pointer"
      )}
    >
      {card.color && (
        <span
          className="absolute inset-y-0 left-0 w-1.5"
          style={{ backgroundColor: card.color }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-1.5">
        <span className="min-w-0 flex-1 break-words">{card.title}</span>
        {hasBody && (
          <TextAlignLeftIcon size={14} className="mt-0.5 shrink-0 text-(--grey-400)" aria-hidden />
        )}
      </div>
      {hasBody && <p className="mt-1 line-clamp-2 text-xs text-(--grey-500)">{preview}</p>}
      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: tag.color, color: getColorForeground(tag.color) }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {days !== null && (
        <span
          className={cn(
            "mt-2 inline-flex items-center rounded-full bg-(--surface-200) px-1.5 py-0.5 text-xs font-semibold tabular-nums",
            days >= 1 ? "text-(--green-500)" : "text-(--red-500)"
          )}
        >
          {days}d
        </span>
      )}
    </div>
  );
}
