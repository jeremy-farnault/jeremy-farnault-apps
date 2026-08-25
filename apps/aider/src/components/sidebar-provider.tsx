"use client";

import type { ConversationListItem } from "@/lib/queries";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const COLLAPSED_STORAGE_KEY = "aider:sidebar-collapsed";

interface SidebarContextValue {
  conversations: ConversationListItem[];
  activeId: string | undefined;
  setActiveId: (id: string | undefined) => void;
  /** Insert the conversation at the top if missing (title required), else move it to the front. */
  upsertToTop: (id: string, title?: string) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function activeIdFromPathname(pathname: string): string | undefined {
  return pathname.match(/^\/chat\/(.+)$/)?.[1];
}

export function SidebarProvider({
  initialConversations,
  children,
}: {
  initialConversations: ConversationListItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationListItem[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | undefined>(() =>
    activeIdFromPathname(pathname)
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hydrate the desktop collapse preference after mount to avoid an SSR mismatch.
  useEffect(() => {
    if (localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const upsertToTop = useCallback((id: string, title?: string) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === id);
      const rest = prev.filter((c) => c.id !== id);
      const item: ConversationListItem = existing ?? { id, title: title ?? "" };
      return [item, ...rest];
    });
  }, []);

  const value = useMemo<SidebarContextValue>(
    () => ({
      conversations,
      activeId,
      setActiveId,
      upsertToTop,
      collapsed,
      toggleCollapsed,
      mobileOpen,
      setMobileOpen,
    }),
    [conversations, activeId, upsertToTop, collapsed, toggleCollapsed, mobileOpen]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within a SidebarProvider");
  return ctx;
}
