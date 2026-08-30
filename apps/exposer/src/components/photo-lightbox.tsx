"use client";

import type { FeedPhoto } from "@/lib/queries";
import { CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

type Props = {
  photos: FeedPhoto[];
  alt: string;
  startIndex: number;
  onClose: () => void;
};

export function PhotoLightbox({ photos, alt, startIndex, onClose }: Props) {
  const count = photos.length;
  const [index, setIndex] = useState(startIndex);

  const go = useCallback(
    (dir: number) => {
      if (count <= 1) return;
      setIndex((current) => (current + dir + count) % count);
    },
    [count]
  );

  // Arrow-key navigation while the lightbox is open (Escape is handled by Radix).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9000] bg-black/90 animate-[overlay-in_0.2s_ease-in-out]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[9001] flex items-center justify-center outline-none"
        >
          <Dialog.Title className="sr-only">{alt || "Photo"}</Dialog.Title>

          <div className="relative h-full w-full">
            <Image
              key={photo.url}
              src={photo.url}
              alt={alt}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <Dialog.Close
            aria-label="Close"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <XIcon size={20} weight="bold" />
          </Dialog.Close>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                <CaretLeftIcon size={22} weight="bold" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
              >
                <CaretRightIcon size={22} weight="bold" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
                {index + 1} / {count}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
