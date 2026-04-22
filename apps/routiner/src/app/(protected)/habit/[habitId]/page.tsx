import { getHabit } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { HabitDetailClient } from "./habit-detail-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ habitId: string }>;
}) {
  const { habitId } = await params;
  if (!UUID_RE.test(habitId)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const habit = await getHabit(userId, habitId);
  if (!habit) notFound();

  return <HabitDetailClient habit={habit} />;
}
