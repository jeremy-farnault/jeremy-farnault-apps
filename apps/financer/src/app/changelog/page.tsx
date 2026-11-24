import { auth } from "@jf/auth";
import { appChangelog } from "@jf/changelog";
import { ChangelogContent, PublicChangelogPage } from "@jf/ui";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ProtectedLayout from "../(protected)/layout";

export const metadata: Metadata = { title: "Financer changelog" };

// Public: the middleware lets /changelog through without a session. Logged out, it's the bare
// page; logged in, it sits in the app's usual shell.
export default async function ChangelogPage() {
  const months = appChangelog("financer");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <PublicChangelogPage
        appName="Financer"
        appIcon={<CoinsIcon className="text-(--text-on-strong-hue)" size={32} />}
        months={months}
        background="/background.svg"
      />
    );
  }

  return (
    <ProtectedLayout>
      <ChangelogContent months={months} />
    </ProtectedLayout>
  );
}
