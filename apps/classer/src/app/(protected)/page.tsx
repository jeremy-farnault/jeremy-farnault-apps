import type { ClasserCardData } from "@/components/classer-card";
import { ClassersGrid } from "@/components/classers-grid";
import { getClassers } from "@/lib/queries";
import { getPublicImageUrl } from "@/lib/s3-url";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function ClasserPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const { classers, nextCursor } = await getClassers(userId, null);

  const cardClassers: ClasserCardData[] = classers.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    imageKey: c.imageKey,
    imageUrl: c.imageKey ? getPublicImageUrl(c.imageKey) : null,
    itemCount: c.itemCount,
  }));

  return (
    <main className="w-full px-4 pt-6 pb-24">
      <ClassersGrid initialClassers={cardClassers} initialNextCursor={nextCursor} />
    </main>
  );
}
