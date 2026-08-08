import type { ShowcaseApp } from "@/config/showcase";
import Image from "next/image";
import Link from "next/link";

export function AppGrid({ apps }: { apps: ShowcaseApp[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-4">
      {apps.map((app) => (
        <Link
          key={app.id}
          href={`/${app.id}`}
          scroll={false}
          className="group flex flex-col items-center gap-3 outline-none"
        >
          <div className="relative h-20 w-20 overflow-hidden rounded-[22px] shadow-[0_10px_24px_0_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out group-hover:scale-105 group-focus-visible:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-(--grey-400) sm:h-24 sm:w-24">
            <Image
              src={`/icons/${app.id}.png`}
              alt={`${app.name} icon`}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <span className="text-sm font-medium text-(--grey-900)">{app.name}</span>
        </Link>
      ))}
    </div>
  );
}
