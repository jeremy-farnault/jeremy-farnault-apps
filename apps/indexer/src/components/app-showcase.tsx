import type { ShowcaseApp } from "@/config/showcase";
import { getColorForeground } from "@jf/ui/color-palette";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { ShowcaseCarousel } from "./showcase-carousel";

export function AppShowcase({ app }: { app: ShowcaseApp }) {
  const accent = `var(${app.accentColor})`;
  const accentForeground = getColorForeground(accent);

  return (
    <div className="flex h-full min-h-0 w-full flex-col md:flex-row">
      {/* Carousel */}
      <div className="flex shrink-0 items-center justify-center p-4 md:w-1/2 md:p-6">
        <div className="aspect-[9/16] w-full max-w-[260px] md:aspect-auto md:h-full md:max-w-none">
          <ShowcaseCarousel
            screenshots={app.screenshots}
            name={app.name}
            accentColor={app.accentColor}
          />
        </div>
      </div>

      {/* Description + CTA */}
      <div className="flex min-h-0 flex-1 flex-col md:w-1/2">
        <div className="flex-1 overflow-y-auto px-5 pb-2 md:px-7 md:pt-10">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px]">
              <Image
                src={`/icons/${app.id}.png`}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
            <h2 className="text-2xl font-semibold text-(--grey-900)">{app.name}</h2>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-(--grey-700)">{app.description}</p>
        </div>

        <div className="p-4 md:px-7 md:pb-7">
          <a
            href={app.href}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] font-medium transition-opacity hover:opacity-90 md:ml-auto md:w-fit md:px-7"
            style={{ backgroundColor: accent, color: accentForeground }}
          >
            Go to app
            <ArrowSquareOutIcon size={18} weight="bold" />
          </a>
        </div>
      </div>
    </div>
  );
}
