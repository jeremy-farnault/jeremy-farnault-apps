import { CurrencySelector } from "@/components/currency-selector";
import { UserMenuConnected } from "@/components/user-menu-connected";
import { getHomeCurrency } from "@/lib/queries";
import { syncThemeCookie } from "@jf/auth/settings-actions";
import { AppShell, ThemeSync, TooltipProvider } from "@jf/ui";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

export const financerIcon = <CoinsIcon className="text-(--text-on-strong-hue)" size={32} />;

/** Financer's app shell for a logged-in user: the logged-in pages and the changelog. */
export async function FinancerShell({ userId, children }: { userId: string; children: ReactNode }) {
  const homeCurrency = await getHomeCurrency(userId);

  return (
    <TooltipProvider>
      <AppShell
        appIcon={financerIcon}
        appName="Financer"
        currentAppId="financer"
        titleHref="/"
        background="/background.svg"
        startSlot={<CurrencySelector homeCurrency={homeCurrency} />}
        rightSlot={<UserMenuConnected />}
      >
        <ThemeSync sync={syncThemeCookie} />
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
