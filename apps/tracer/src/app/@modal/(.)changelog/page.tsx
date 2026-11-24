import { appChangelog } from "@jf/changelog";
import { ChangelogModal } from "@jf/ui";

// A link to /changelog followed inside Tracer lands here and opens the modal; a full load of
// /changelog renders app/changelog/page.tsx instead.
export default function InterceptedChangelogModal() {
  return <ChangelogModal months={appChangelog("tracer")} />;
}
