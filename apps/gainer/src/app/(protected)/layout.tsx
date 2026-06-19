import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<BarbellIcon className="text-white" size={32} />}
        appName="Gainer"
        currentAppId="gainer"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
