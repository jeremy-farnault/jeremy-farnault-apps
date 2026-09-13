import { UnifierClient } from "@/components/unifier-client";
import { getArcsAndPeople } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function UnifierPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const { arcs, persons, slots, lastTouchAt } = await getArcsAndPeople(userId);

  return <UnifierClient arcs={arcs} persons={persons} slots={slots} lastTouchAt={lastTouchAt} />;
}
