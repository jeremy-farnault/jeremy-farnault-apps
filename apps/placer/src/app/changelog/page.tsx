import { auth } from "@jf/auth";
import { appChangelog } from "@jf/changelog";
import { ChangelogContent, PublicChangelogPage } from "@jf/ui";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ProtectedLayout from "../(protected)/layout";

export const metadata: Metadata = { title: "Placer changelog" };

// Public: the middleware lets /changelog through without a session. Logged out, it's the bare
// page; logged in, it sits in the app's usual shell.
export default async function ChangelogPage() {
  const months = appChangelog("placer");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <PublicChangelogPage
        appName="Placer"
        appIcon={<MapPinIcon className="text-(--text-on-strong-hue)" size={32} />}
        months={months}
      />
    );
  }

  return (
    <ProtectedLayout>
      <ChangelogContent months={months} />
    </ProtectedLayout>
  );
}
