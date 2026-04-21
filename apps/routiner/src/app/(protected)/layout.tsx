import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { ChecksIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<ChecksIcon className="text-(--primary)" size={32} />}
        appName="Routiner"
        currentAppId="routiner"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
