import type { ReactNode } from "react";
import { AppSwitcher } from "./app-switcher";

interface AppShellProps {
  children: ReactNode;
  bottomBarItems?: ReactNode;
  currentAppId?: string;
}

export function AppShell({ children, bottomBarItems, currentAppId }: AppShellProps) {
  return (
    <div className="relative min-h-screen pb-16 md:pb-0">
      {/* Desktop: AppSwitcher fixed top-left */}
      <div className="fixed top-4 left-4 z-40 hidden md:block">
        <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
      </div>

      {children}

      {/* Mobile: fixed bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center gap-4 border-t border-(--border) bg-(--card) px-4 md:hidden">
        <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
        {bottomBarItems}
      </div>
    </div>
  );
}
