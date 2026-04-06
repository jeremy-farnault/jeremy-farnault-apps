import type { ReactNode } from "react";
import { AppSwitcher } from "./app-switcher";

interface AppShellProps {
  children: ReactNode;
  bottomBarItems?: ReactNode;
  currentAppId?: string;
  appName?: string;
  appIcon?: ReactNode;
}

export function AppShell({ children, bottomBarItems, currentAppId, appName, appIcon }: AppShellProps) {
  const hasHeader = appName || appIcon;

  return (
    <div className="relative min-h-screen pb-16 md:pb-0">
      {hasHeader && (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-(--border) bg-(--card) px-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-(--grey-900)">
            {appIcon}
            {appName}
          </div>
          <div className="hidden md:block">
            <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
          </div>
        </header>
      )}

      {!hasHeader && (
        <div className="fixed top-4 left-4 z-40 hidden md:block">
          <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
        </div>
      )}

      {children}

      {/* Mobile: fixed bottom bar — no AppSwitcher */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center gap-4 border-t border-(--border) bg-(--card) px-4 md:hidden">
        {bottomBarItems}
      </div>
    </div>
  );
}
