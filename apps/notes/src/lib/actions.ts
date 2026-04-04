"use server";

import { auth } from "@jf/auth";
import { db, folders, notes } from "@jf/db";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAllFolders, searchNotes, type Note } from "./queries";
import { getDescendantIds } from "./folder-utils";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Folder actions ───────────────────────────────────────────────────────────

export async function createFolder(
  parentFolderId: string | null,
  name: string,
): Promise<void> {
  if (!name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  await db.insert(folders).values({
    userId,
    parentFolderId,
    name: name.trim(),
  });
  revalidatePath("/", "layout");
}

export async function renameFolder(
  folderId: string,
  name: string,
): Promise<void> {
  if (!name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  await db
    .update(folders)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
  revalidatePath("/", "layout");
}

export async function moveFolder(
  folderId: string,
  newParentFolderId: string | null,
): Promise<void> {
  const userId = await getAuthUserId();
  if (newParentFolderId !== null) {
    const allFolders = await getAllFolders(userId);
    const descendantIds = getDescendantIds(folderId, allFolders);
    if (descendantIds.includes(newParentFolderId)) {
      throw new Error("Cannot move a folder into one of its own descendants");
    }
  }
  await db
    .update(folders)
    .set({ parentFolderId: newParentFolderId, updatedAt: new Date() })
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
  revalidatePath("/", "layout");
}

// ─── Note actions ─────────────────────────────────────────────────────────────

export async function createNote(
  parentFolderId: string | null,
  title: string | null,
  body: string | null,
  color: string,
): Promise<string> {
  const userId = await getAuthUserId();
  const result = await db
    .insert(notes)
    .values({
      userId,
      parentFolderId,
      title: title || null,
      body: body || null,
      backgroundColor: color,
    })
    .returning({ id: notes.id });
  const created = result[0];
  if (!created) throw new Error("Failed to create note");
  return created.id;
}

export async function updateNote(
  noteId: string,
  title: string | null,
  body: string | null,
  color: string,
): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(notes)
    .set({
      title: title || null,
      body: body || null,
      backgroundColor: color,
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

export async function archiveNote(noteId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(notes)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  revalidatePath("/", "layout");
}

export async function restoreNote(noteId: string): Promise<void> {
  const userId = await getAuthUserId();
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);
  if (!note) throw new Error("Note not found");

  let targetFolderId = note.parentFolderId;
  if (targetFolderId) {
    const [parent] = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, targetFolderId), isNull(folders.archivedAt)))
      .limit(1);
    if (!parent) targetFolderId = null;
  }

  await db
    .update(notes)
    .set({ archivedAt: null, parentFolderId: targetFolderId, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteNote(noteId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteFolder(folderId: string): Promise<void> {
  const userId = await getAuthUserId();
  await db.delete(folders).where(and(eq(folders.id, folderId), eq(folders.userId, userId)));
  revalidatePath("/", "layout");
}

export async function searchNotesAction(query: string): Promise<Note[]> {
  if (!query.trim()) return [];
  const userId = await getAuthUserId();
  return searchNotes(userId, query.trim());
}

export async function moveNote(
  noteId: string,
  newParentFolderId: string | null,
): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(notes)
    .set({ parentFolderId: newParentFolderId, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
  revalidatePath("/", "layout");
}
