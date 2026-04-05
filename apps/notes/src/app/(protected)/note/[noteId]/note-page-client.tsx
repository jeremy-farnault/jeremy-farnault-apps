"use client";

import { useRouter } from "next/navigation";
import type { Note } from "@/lib/queries";
import { NotePanel } from "@/components/note-panel";

export function NotePageClient({ note }: { note: Note }) {
  const router = useRouter();
  const backHref = note.parentFolderId ? `/${note.parentFolderId}` : "/";

  return (
    <NotePanel
      note={note}
      parentFolderId={note.parentFolderId}
      allFolders={[]}
      onClose={() => router.push(backHref)}
    />
  );
}
