import { SidebarProvider } from "@/components/sidebar-provider";
import { SidebarShell } from "@/components/sidebar-shell";
import { UserMenuConnected } from "@/components/user-menu-connected";
import { listConversations } from "@/lib/queries";
import { auth } from "@jf/auth";
import { AppShell, TooltipProvider } from "@jf/ui";
import { RobotIcon } from "@phosphor-icons/react/dist/ssr";
import { headers } from "next/headers";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const conversations = session ? await listConversations(session.user.id) : [];

  return (
    <SidebarProvider initialConversations={conversations}>
      <TooltipProvider>
        <AppShell
          appIcon={<RobotIcon className="text-white" size={32} />}
          appName="Aider"
          currentAppId="aider"
          titleHref="/"
          rightSlot={<UserMenuConnected />}
        >
          <SidebarShell>{children}</SidebarShell>
        </AppShell>
      </TooltipProvider>
    </SidebarProvider>
  );
}
