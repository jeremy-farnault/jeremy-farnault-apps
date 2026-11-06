import { UserMenuConnected } from "@/components/user-menu-connected";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppSwitcher, ThemeSync, Tooltip, TooltipProvider } from "@jf/ui";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="relative w-full h-screen overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-[4000] flex h-14 items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="flex items-center gap-2 text-l font-semibold text-(--primary-foreground) hover:opacity-80 transition-opacity bg-(--primary) px-4 py-1 rounded-xl"
            >
              <MapTrifoldIcon size={32} />
              Tracer
            </a>
            <Tooltip
              side="bottom"
              content="Tracer is a work in progress: expect rough edges and missing pieces. Your progress is saved in this browser only."
            >
              <span className="rounded-lg bg-(--hud-glass)/90 px-2.5 py-1 text-xs font-medium text-(--hud-text) backdrop-blur-sm border border-(--hud-glass-strong)">
                Early build
              </span>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <AppSwitcher currentAppId="tracer" />
            <UserMenuConnected />
          </div>
        </header>
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </div>
    </TooltipProvider>
  );
}
