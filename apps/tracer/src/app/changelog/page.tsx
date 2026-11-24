import { auth } from "@jf/auth";
import { appChangelog } from "@jf/changelog";
import { ChangelogContent, PublicChangelogPage } from "@jf/ui";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import { headers } from "next/headers";
import ProtectedLayout from "../(protected)/layout";

export const metadata: Metadata = { title: "Tracer changelog" };

// Public: the middleware lets /changelog through without a session. Logged out, it's the bare
// page; logged in, it sits in the app's usual shell.
export default async function ChangelogPage() {
  const months = appChangelog("tracer");
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <PublicChangelogPage
        appName="Tracer"
        appIcon={<MapTrifoldIcon size={32} />}
        months={months}
      />
    );
  }

  return (
    <ProtectedLayout>
      <ChangelogContent months={months} className="h-full pt-16" />
    </ProtectedLayout>
  );
}
