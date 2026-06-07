import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<MapPinIcon className="text-white" size={32} />}
        appName="Placer"
        currentAppId="placer"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
