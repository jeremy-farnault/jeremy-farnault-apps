import { cn } from "@jf/ui";
import { ImageIcon } from "@phosphor-icons/react";

/**
 * An item's image, or the placeholder icon when it has none. `card` fills the left side of a
 * list card edge to edge, like Classer's thumbnails, so the card's own corners clip it.
 */
export function ItemImage({ url, size }: { url: string | null; size: "sm" | "lg" | "card" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-(--surface-sunken) text-(--text-subtle)",
        size === "sm" && "h-14 w-14 rounded-xl",
        size === "lg" && "h-24 w-24 rounded-xl",
        size === "card" && "h-full w-[120px] md:w-40"
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className={cn("h-full w-full", size === "card" ? "object-cover" : "object-contain")}
        />
      ) : (
        <ImageIcon size={size === "sm" ? 24 : 36} aria-hidden />
      )}
    </div>
  );
}
