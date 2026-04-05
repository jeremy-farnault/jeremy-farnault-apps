import { auth } from "@jf/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ArchivedFolderCard } from "@/components/archived-folder-card";
import { ArchivedNoteCard } from "@/components/archived-note-card";
import { getArchivedFolders, getArchivedNotes } from "@/lib/queries";

export default async function ArchivePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const [archivedFolders, archivedNotes] = await Promise.all([
    getArchivedFolders(userId),
    getArchivedNotes(userId),
  ]);

  const isEmpty = archivedFolders.length === 0 && archivedNotes.length === 0;

  return (
    <div>
      <div>
        <Link href="/">← Back</Link>
        <h1>Archive</h1>
      </div>
      {isEmpty ? (
        <p>Nothing archived yet.</p>
      ) : (
        <div>
          {archivedFolders.map((folder) => (
            <ArchivedFolderCard key={folder.id} folder={folder} />
          ))}
          {archivedNotes.map((note) => (
            <ArchivedNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
