import { cn } from "@jf/ui";
import { ImageIcon } from "@phosphor-icons/react";

/** An item's image, or the placeholder icon when it has none. */
export function ItemImage({ url, size }: { url: string | null; size: "sm" | "lg" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-(--surface-sunken) text-(--text-subtle)",
        size === "sm" ? "h-14 w-14" : "h-24 w-24"
      )}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-contain" />
      ) : (
        <ImageIcon size={size === "sm" ? 24 : 36} aria-hidden />
      )}
    </div>
  );
}
