import type { FeedItem as FeedItemData } from "@/lib/queries";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import Image from "next/image";

export function FeedItem({ item, onEdit }: { item: FeedItemData; onEdit?: () => void }) {
  return (
    <article className="flex flex-col gap-2">
      {(item.title || item.isDraft || onEdit) && (
        <div className="flex items-center gap-2">
          {item.title && (
            <h2 className="text-base font-semibold text-(--grey-900)">{item.title}</h2>
          )}
          {item.isDraft && (
            <span className="rounded-full bg-(--surface-300) px-2 py-0.5 text-xs font-medium text-(--grey-600)">
              Draft
            </span>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit post"
              className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-(--grey-500) hover:bg-(--surface-200) hover:text-(--grey-900)"
            >
              <PencilSimpleIcon size={16} />
            </button>
          )}
        </div>
      )}

      {item.descriptionHtml && (
        <div
          className="exposer-description text-sm text-(--grey-700)"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: server-sanitized rich text (see lib/description.ts)
          dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
        />
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
