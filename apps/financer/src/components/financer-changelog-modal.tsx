"use client";

import { type ChangelogListMonth, ChangelogModal } from "@jf/ui";
import { useRouter } from "next/navigation";

export function FinancerChangelogModal({ months }: { months: readonly ChangelogListMonth[] }) {
  const router = useRouter();
  return <ChangelogModal months={months} onClose={() => router.back()} />;
}
