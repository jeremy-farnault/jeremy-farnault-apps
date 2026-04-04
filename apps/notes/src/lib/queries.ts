import { db, folders, notes } from "@jf/db";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Folder = typeof folders.$inferSelect;
export type Note = typeof notes.$inferSelect;

export { type SortOption, type GridItem, sortItems } from "./grid-utils";
export { getDescendantIds } from "./folder-utils";

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllFolders(userId: string): Promise<Folder[]> {
  return db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), isNull(folders.archivedAt)));
}

export async function getFolderById(
  userId: string,
  folderId: string,
): Promise<Folder | null> {
  const [folder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);

  return folder ?? null;
}

export async function getFolderContents(
  userId: string,
  folderId: string | null,
): Promise<{ folders: Folder[]; notes: Note[] }> {
  const folderRows = await db
    .select()
    .from(folders)
    .where(
      and(
        eq(folders.userId, userId),
        folderId ? eq(folders.parentFolderId, folderId) : isNull(folders.parentFolderId),
        isNull(folders.archivedAt),
      ),
    );

  const noteRows = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        folderId ? eq(notes.parentFolderId, folderId) : isNull(notes.parentFolderId),
        isNull(notes.archivedAt),
      ),
    );

  return { folders: folderRows, notes: noteRows };
}

export async function getFolderBreadcrumb(
  folderId: string,
): Promise<{ id: string; name: string }[]> {
  const crumbs: { id: string; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, currentId))
      .limit(1);

    if (!folder) break;

    crumbs.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentFolderId ?? null;
  }

  return crumbs;
}

export async function getArchivedNotes(userId: string): Promise<Note[]> {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), isNotNull(notes.archivedAt)))
    .orderBy(desc(notes.archivedAt));
}

export async function getNoteById(
  userId: string,
  noteId: string,
): Promise<Note | null> {
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
    .limit(1);

  return note ?? null;
}

export async function searchNotes(userId: string, query: string): Promise<Note[]> {
  const tsQuery = sql`plainto_tsquery('english', ${query})`;
  return db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNull(notes.archivedAt),
        sql`search_vector @@ ${tsQuery}`,
      ),
    )
    .orderBy(desc(sql`ts_rank(search_vector, ${tsQuery})`))
    .limit(50);
}
