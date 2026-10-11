import { UserMenuConnected } from "@/components/user-menu-connected";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppShell, ThemeSync, TooltipProvider } from "@jf/ui";
import { RankingIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<RankingIcon className="text-(--text-on-strong-hue)" size={32} />}
        appName="Classer"
        currentAppId="classer"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
