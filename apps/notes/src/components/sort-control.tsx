"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SortOption } from "@/lib/queries";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "modified-desc", label: "Last modified" },
  { value: "alpha-asc", label: "Name A–Z" },
  { value: "alpha-desc", label: "Name Z–A" },
  { value: "type", label: "Folders first" },
];

type Props = {
  current: SortOption;
};

export function SortControl({ current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={current} onChange={handleChange}>
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
