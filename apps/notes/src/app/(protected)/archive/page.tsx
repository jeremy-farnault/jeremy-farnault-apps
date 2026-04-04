import { auth } from "@jf/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { ArchivedNoteCard } from "@/components/archived-note-card";
import { getArchivedNotes } from "@/lib/queries";

export default async function ArchivePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session!.user.id;

  const archivedNotes = await getArchivedNotes(userId);

  return (
    <div>
      <div>
        <Link href="/">← Back</Link>
        <h1>Archive</h1>
      </div>
      {archivedNotes.length === 0 ? (
        <p>Nothing archived yet.</p>
      ) : (
        <div>
          {archivedNotes.map((note) => (
            <ArchivedNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
