import type { ReactNode } from "react";
import { AppSwitcher } from "./app-switcher";

interface AppShellProps {
  appIcon: ReactNode;
  appName: string;
  children: ReactNode;
  currentAppId?: string;
}

export function AppShell({ children, currentAppId, appName, appIcon }: AppShellProps) {
  return (
    <div className="relative flex flex-col items-center justify-start w-full max-w-[1024px] min-h-screen pb-16 md:pb-0">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 w-full pt-3">
        <div className="flex items-center gap-2 text-l font-semibold text-(--grey-900)">
          {appIcon}
          {appName}
        </div>
        <AppSwitcher {...(currentAppId !== undefined && { currentAppId })} />
      </header>

      {children}
    </div>
  );
}
