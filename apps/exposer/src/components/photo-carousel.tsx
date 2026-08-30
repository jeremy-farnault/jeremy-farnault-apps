"use client";

import { PhotoLightbox } from "@/components/photo-lightbox";
import type { FeedPhoto } from "@/lib/queries";
import { cn } from "@jf/ui";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

type Props = {
  photos: FeedPhoto[];
  alt: string;
};

export function PhotoCarousel({ photos, alt }: Props) {
  const count = photos.length;
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: number) => {
      if (count <= 1) return;
      setIndex((current) => (current + dir + count) % count);
    },
    [count]
  );

  const active = photos[index];
  if (!active) return null;

  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-(--surface-200) transition-[aspect-ratio] duration-200"
        style={{ aspectRatio: `${active.width} / ${active.height}` }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touchStartX.current = null;
        }}
      >
        <button
          type="button"
          aria-label="Open photo fullscreen"
          onClick={() => setLightboxIndex(index)}
          className="absolute inset-0 cursor-zoom-in"
        />

        {photos.map((photo, i) => (
          <Image
            key={photo.url}
            src={photo.url}
            alt={alt}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority={i === 0}
            className={cn(
              "pointer-events-none object-contain transition-opacity duration-300",
              i === index ? "opacity-100" : "opacity-0"
            )}
          />
        ))}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--card)/80 text-(--grey-800) shadow-sm backdrop-blur hover:bg-(--card)"
            >
              <CaretLeftIcon size={20} weight="bold" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--card)/80 text-(--grey-800) shadow-sm backdrop-blur hover:bg-(--card)"
            >
              <CaretRightIcon size={20} weight="bold" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {photos.map((photo, i) => (
                <button
                  key={photo.url}
                  type="button"
                  aria-label={`Go to photo ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-5 bg-(--grey-700)" : "w-1.5 bg-(--grey-400)"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          alt={alt}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
