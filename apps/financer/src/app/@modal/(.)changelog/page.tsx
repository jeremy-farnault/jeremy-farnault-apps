import { FinancerChangelogModal } from "@/components/financer-changelog-modal";
import { appChangelog } from "@jf/changelog";

// A link to /changelog followed inside Financer lands here and opens the modal; a full load of
// /changelog renders app/changelog/page.tsx instead.
export default function InterceptedChangelogModal() {
  return <FinancerChangelogModal months={appChangelog("financer")} />;
}
