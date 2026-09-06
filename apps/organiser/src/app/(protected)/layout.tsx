import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppShell, TooltipProvider } from "@jf/ui";
import { KanbanIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<KanbanIcon className="text-white" size={32} />}
        appName="Organiser"
        currentAppId="organiser"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
        fullHeight
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
