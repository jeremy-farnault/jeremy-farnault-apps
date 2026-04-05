import { getNoteById } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { NotePageClient } from "./note-page-client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  if (!UUID_RE.test(noteId)) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id || "";

  const note = await getNoteById(userId, noteId);
  if (!note) notFound();

  return <NotePageClient note={note} />;
}
