import { CurrencySelector } from "@/components/currency-selector";
import { UserMenuConnected } from "@/components/user-menu-connected";
import { getHomeCurrency } from "@/lib/queries";
import { auth } from "@jf/auth";
import { AppShell, TooltipProvider } from "@jf/ui";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr";
import { headers } from "next/headers";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";
  const homeCurrency = await getHomeCurrency(userId);

  return (
    <TooltipProvider>
      <AppShell
        appIcon={<CoinsIcon className="text-white" size={32} />}
        appName="Financer"
        currentAppId="financer"
        titleHref="/"
        startSlot={<CurrencySelector homeCurrency={homeCurrency} />}
        rightSlot={<UserMenuConnected />}
      >
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
