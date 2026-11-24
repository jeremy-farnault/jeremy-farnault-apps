import { FinancerShell, financerIcon } from "@/components/financer-shell";
import { auth } from "@jf/auth";
import { appChangelog } from "@jf/changelog";
import { ChangelogContent, PublicChangelogPage } from "@jf/ui";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Financer changelog" };

// Public: the middleware lets /changelog through without a session.
export default async function ChangelogPage() {
  const months = appChangelog("financer");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <PublicChangelogPage
        appName="Financer"
        appIcon={financerIcon}
        months={months}
        background="/background.svg"
      />
    );
  }

  return (
    <FinancerShell userId={session.user.id}>
      <ChangelogContent months={months} />
    </FinancerShell>
  );
}
