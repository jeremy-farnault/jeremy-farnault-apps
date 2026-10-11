import { UserMenuConnected } from "@/components/user-menu-connected";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppShell, ThemeSync, TooltipProvider } from "@jf/ui";
import { KanbanIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<KanbanIcon className="text-(--text-on-strong-hue)" size={32} />}
        appName="Organiser"
        currentAppId="organiser"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
        fullHeight
      >
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
