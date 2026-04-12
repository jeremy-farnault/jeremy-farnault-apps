import { ArchiveGrid } from "@/components/archive-grid";
import { Breadcrumb } from "@/components/breadcrumb";
import { getArchivedFolders, getArchivedNotes } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function ArchivePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id || "";

  const [folders, notes] = await Promise.all([
    getArchivedFolders(userId),
    getArchivedNotes(userId),
  ]);

  return (
    <ArchiveGrid
      folders={folders}
      notes={notes}
      breadcrumb={<Breadcrumb crumbs={[{ id: "archive", name: "Archive", href: "/archive" }]} />}
    />
  );
}
