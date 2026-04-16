import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { EntriesGrid } from "@/components/entries-grid";
import { getEntries } from "@/lib/queries";
import type { CardEntry } from "@/components/entry-card";

export default async function JournalerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const { entries, nextCursor } = await getEntries(userId, null);

  const cardEntries: CardEntry[] = entries.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category,
    date: e.date,
    comment: e.comment,
    rating: e.rating,
    imageUrl: null, // S3 deferred to ticket 06
  }));

  return (
    <main className="p-6">
      <EntriesGrid initialEntries={cardEntries} initialNextCursor={nextCursor} />
    </main>
  );
}
