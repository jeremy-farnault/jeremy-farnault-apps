"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>
        Notes
      </Link>
      <Link href="/archive" aria-current={pathname === "/archive" ? "page" : undefined}>
        Archive
      </Link>
    </nav>
  );
}
