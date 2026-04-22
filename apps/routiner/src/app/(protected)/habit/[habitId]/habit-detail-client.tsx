"use client";

import { Breadcrumb } from "@/components/breadcrumb";
import type { Habit } from "@/lib/queries";

type Props = { habit: Habit };

export function HabitDetailClient({ habit }: Props) {
  return (
    <div>
      <Breadcrumb crumbs={[{ label: habit.name }]} />
      <p className="text-sm text-(--grey-500)">Coming soon</p>
    </div>
  );
}
