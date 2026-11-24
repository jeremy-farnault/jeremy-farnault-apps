import { appChangelog } from "@jf/changelog";
import { ChangelogContent } from "@jf/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exposer changelog" };

// Exposer is public already: the root layout's shell works logged in and logged out.
export default function ChangelogPage() {
  return <ChangelogContent months={appChangelog("exposer")} />;
}
