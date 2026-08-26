"use client";

import { ConversationRow } from "@/components/conversation-row";
import { useSidebar } from "@/components/sidebar-provider";
import { cn } from "@jf/ui";
import { ListIcon, NotePencilIcon, SidebarSimpleIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";

function ConversationList() {
  const { conversations, setActiveId, setMobileOpen } = useSidebar();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2">
        <Link
          href="/"
          onClick={() => {
            setActiveId(undefined);
            setMobileOpen(false);
          }}
          className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-(--grey-900) hover:bg-(--surface-150) transition-colors"
        >
          <NotePencilIcon size={18} />
          New chat
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
        {conversations.length === 0 ? (
          <p className="px-3 py-2 text-sm text-(--grey-400)">No conversations yet</p>
        ) : (
          conversations.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} />
          ))
        )}
      </div>
    </div>
  );
}

export function SidebarShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="flex flex-1 min-h-0 w-full">
      {/* Always-visible rail: thin strip on mobile / collapsed desktop, full on expanded desktop */}
      <aside
        className={cn(
          "flex flex-col shrink-0 border-r border-(--surface-200) w-12",
          collapsed ? "md:w-12" : "md:w-[260px]"
        )}
      >
        <div className="flex items-center p-2">
          {/* Mobile: open the overlay drawer */}
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
        </div>

        {/* Conversation list: desktop only, expanded only */}
        {!collapsed && (
          <div className="hidden md:flex md:flex-col flex-1 min-h-0">
            <ConversationList />
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[5000] bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-[5001] w-[280px] bg-(--card) border-r border-(--surface-200) shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] p-1.5 text-(--grey-700) hover:bg-(--surface-150) transition-colors"
              >
                <XIcon size={18} />
              </button>
            </div>
            <ConversationList />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  );
}
