import type { FeedItem as FeedItemData } from "@/lib/queries";
import Image from "next/image";

export function FeedItem({ item }: { item: FeedItemData }) {
  return (
    <article className="flex flex-col gap-2">
      {(item.title || item.isDraft) && (
        <div className="flex items-center gap-2">
          {item.title && (
            <h2 className="text-base font-semibold text-(--grey-900)">{item.title}</h2>
          )}
          {item.isDraft && (
            <span className="rounded-full bg-(--surface-300) px-2 py-0.5 text-xs font-medium text-(--grey-600)">
              Draft
            </span>
          )}
        </div>
      )}

      {/* Basic sequential photo display; swipe carousel + lightbox come in ticket 10. */}
      <div className="flex flex-col gap-2">
        {item.photos.map((photo, i) => (
          <Image
            key={photo.url}
            src={photo.url}
            alt={item.title ?? ""}
            width={photo.width}
            height={photo.height}
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority={i === 0}
            className="h-auto w-full rounded-xl bg-(--surface-200)"
          />
        ))}
      </div>
    </article>
  );
}
