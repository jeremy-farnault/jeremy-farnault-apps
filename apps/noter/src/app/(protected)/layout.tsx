import { RemindersBell } from "@/components/reminders-bell";
import { UserMenuConnected } from "@/components/user-menu-connected";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppShell, ThemeSync, TooltipProvider } from "@jf/ui";
import { NotepadIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<NotepadIcon className="text-white" size={32} />}
        appName="Noter"
        currentAppId="noter"
        titleHref="/"
        startSlot={<RemindersBell />}
        rightSlot={<UserMenuConnected />}
      >
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
