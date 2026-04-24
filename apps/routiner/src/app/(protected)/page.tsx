import { HabitsGrid } from "@/components/habits-grid";
import { type SortOption, getHabits, getUserHabitLogs } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function Page({ searchParams }: Props) {
  const { sort: sortParam } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";
  const sort = (sortParam as SortOption | undefined) ?? "createdAt";

  const [habits, logs] = await Promise.all([
    getHabits(userId, sort),
    getUserHabitLogs(userId),
  ]);

  return <HabitsGrid key={sort} habits={habits} logs={logs} sort={sort} />;
}
