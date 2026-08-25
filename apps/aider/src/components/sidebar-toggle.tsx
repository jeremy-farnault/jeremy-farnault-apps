"use client";

import { useSidebar } from "@/components/sidebar-provider";
import { ListIcon, SidebarSimpleIcon } from "@phosphor-icons/react";

export function SidebarToggle() {
  const { toggleCollapsed, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile: open the drawer */}
      <button
        type="button"
        aria-label="Open conversations"
        onClick={() => setMobileOpen(true)}
        className="md:hidden rounded-[10px] p-1.5 text-(--grey-700) hover:bg-(--surface-150) transition-colors"
      >
        <ListIcon size={20} />
      </button>

      {/* Desktop: collapse/expand the rail */}
      <button
        type="button"
        aria-label="Toggle sidebar"
        onClick={toggleCollapsed}
        className="hidden md:inline-flex rounded-[10px] p-1.5 text-(--grey-700) hover:bg-(--surface-150) transition-colors"
      >
        <SidebarSimpleIcon size={20} />
      </button>
    </>
  );
}
