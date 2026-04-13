import { AppShell, TooltipProvider } from "@jf/ui";
import { NotepadIcon } from "@phosphor-icons/react/dist/ssr";
import { UserMenuConnected } from "@/components/user-menu-connected";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppShell
        appIcon={<NotepadIcon className="text-(--primary)" size={32} />}
        appName="Noter"
        currentAppId="notes"
        titleHref="/"
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
