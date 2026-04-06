"use client";

import { cn } from "@jf/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NotesNav() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Notes" },
    { href: "/archive", label: "Archive" },
  ];

  return (
    <nav className="flex items-center gap-4">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-sm",
              isActive
                ? "font-medium text-(--foreground)"
                : "text-(--muted-foreground) hover:text-(--foreground)"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
