import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { RankingIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<RankingIcon className="text-white" size={32} />}
        appName="Classer"
        currentAppId="classer"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
