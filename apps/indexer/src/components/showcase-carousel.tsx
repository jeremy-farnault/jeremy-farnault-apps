"use client";

import { cn } from "@jf/ui";
import { CaretLeftIcon, CaretRightIcon, ImageIcon } from "@phosphor-icons/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface CarouselProps {
  screenshots: string[];
  name: string;
  /** CSS custom property name, e.g. "--green-400". */
  accentColor: string;
}

export function ShowcaseCarousel({ screenshots, name, accentColor }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = screenshots.length;
  const accent = `var(${accentColor})`;

  const go = useCallback(
    (dir: number) => {
      if (count <= 1) return;
      setIndex((current) => (current + dir + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count <= 1) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, count]);

  if (count === 0) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-[20px]"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)` }}
      >
        <div className="flex flex-col items-center gap-2 text-(--grey-500)">
          <ImageIcon size={40} weight="light" />
          <span className="text-sm">Screenshots coming soon</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[20px]"
      style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current === null) return;
        const dx = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchStartX.current = null;
      }}
    >
      {screenshots.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={`${name} screenshot ${i + 1}`}
          fill
          sizes="(max-width: 768px) 90vw, 420px"
          priority={i === 0}
          className={cn(
            "object-contain transition-opacity duration-300",
            i === index ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />
      ))}

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous screenshot"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--card)/80 text-(--grey-800) shadow-sm backdrop-blur hover:bg-(--card)"
          >
            <CaretLeftIcon size={20} weight="bold" />
          </button>
          <button
            type="button"
            aria-label="Next screenshot"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-(--card)/80 text-(--grey-800) shadow-sm backdrop-blur hover:bg-(--card)"
          >
            <CaretRightIcon size={20} weight="bold" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {screenshots.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`Go to screenshot ${i + 1}`}
                onClick={() => setIndex(i)}
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
  );
}
