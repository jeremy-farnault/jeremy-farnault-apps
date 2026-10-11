import { UserMenuConnected } from "@/components/user-menu-connected";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppShell, ThemeSync, TooltipProvider } from "@jf/ui";
import { ChecksIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<ChecksIcon className="text-(--text-on-strong-hue)" size={32} />}
        appName="Routiner"
        currentAppId="routiner"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
