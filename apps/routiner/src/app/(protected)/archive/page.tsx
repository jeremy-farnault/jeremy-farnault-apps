import { ArchivedHabitsGrid } from "@/components/archived-habits-grid";
import { type SortOption, getArchivedHabits, getUserHabitLogs } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function Page({ searchParams }: Props) {
  const { sort: sortParam } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";
  const sort = (sortParam as SortOption | undefined) ?? "createdAt";

  const [habits, logs] = await Promise.all([
    getArchivedHabits(userId, sort),
    getUserHabitLogs(userId),
  ]);

  return <ArchivedHabitsGrid habits={habits} logs={logs} sort={sort} />;
}
