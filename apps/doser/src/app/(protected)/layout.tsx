import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { PillIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<PillIcon className="text-white" size={32} />}
        appName="Doser"
        currentAppId="doser"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
