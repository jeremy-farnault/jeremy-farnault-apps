import { ArchivedClassersGrid } from "@/components/archived-classers-grid";
import { getArchivedClassers } from "@/lib/queries";
import { getPublicImageUrl } from "@/lib/s3-url";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function ArchivePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";
  const rows = await getArchivedClassers(userId);
  const classers = rows.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    imageKey: c.imageKey,
    imageUrl: c.imageKey ? getPublicImageUrl(c.imageKey) : null,
    itemCount: c.itemCount,
  }));
  return (
    <main className="w-full">
      <ArchivedClassersGrid classers={classers} />
    </main>
  );
}
