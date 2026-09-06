"use server";

import { auth } from "@jf/auth";
import {
  db,
  organiserBoards,
  organiserCardTags,
  organiserCards,
  organiserColumns,
  organiserTags,
} from "@jf/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import { keyAfter } from "./ordering";
import type { CardRow, ColumnRow, TagRow } from "./queries";

// The default palette colour applied to tags created on the fly (the app accent).
const DEFAULT_TAG_COLOR = "var(--blue-600)";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function createCardAction(input: {
  columnId: string;
  title: string;
}): Promise<CardRow> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const userId = await getUserId();

  // Verify the column belongs to the user and grab its board.
  const columns = await db
    .select({ boardId: organiserColumns.boardId })
    .from(organiserColumns)
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)))
    .limit(1);
  const column = columns[0];
  if (!column) throw new Error("Column not found");

  // Append after the column's current last card.
  const last = await db
    .select({ position: organiserCards.position })
    .from(organiserCards)
    .where(and(eq(organiserCards.columnId, input.columnId), eq(organiserCards.userId, userId)))
    .orderBy(desc(organiserCards.position))
    .limit(1);
  const position = keyAfter(last[0]?.position ?? null);

  const inserted = await db
    .insert(organiserCards)
    .values({
      userId,
      boardId: column.boardId,
      columnId: input.columnId,
      title,
      position,
    })
    .returning({
      id: organiserCards.id,
      columnId: organiserCards.columnId,
      title: organiserCards.title,
      body: organiserCards.body,
      color: organiserCards.color,
      deadline: organiserCards.deadline,
      position: organiserCards.position,
    });

  const card = inserted[0];
  if (!card) throw new Error("Failed to create card");
  return card;
}

export async function updateCardAction(input: {
  cardId: string;
  title: string;
  body: string | null;
  color: string | null;
  deadline: string | null;
  columnId: string;
  tagIds: string[];
}): Promise<CardRow> {
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");

  const userId = await getUserId();

  // Resolve the card being edited (and where it currently lives), scoped to the user.
  const existing = await db
    .select({
      columnId: organiserCards.columnId,
      boardId: organiserCards.boardId,
      position: organiserCards.position,
    })
    .from(organiserCards)
    .where(and(eq(organiserCards.id, input.cardId), eq(organiserCards.userId, userId)))
    .limit(1);
  const current = existing[0];
  if (!current) throw new Error("Card not found");

  let columnId = current.columnId;
  let boardId = current.boardId;
  let position = current.position;

  // Moving to a different column drops the card at that column's end.
  if (input.columnId !== current.columnId) {
    const target = await db
      .select({ boardId: organiserColumns.boardId })
      .from(organiserColumns)
      .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)))
      .limit(1);
    const targetColumn = target[0];
    if (!targetColumn) throw new Error("Column not found");

    const last = await db
      .select({ position: organiserCards.position })
      .from(organiserCards)
      .where(and(eq(organiserCards.columnId, input.columnId), eq(organiserCards.userId, userId)))
      .orderBy(desc(organiserCards.position))
      .limit(1);

    columnId = input.columnId;
    boardId = targetColumn.boardId;
    position = keyAfter(last[0]?.position ?? null);
  }

  const updated = await db
    .update(organiserCards)
    .set({
      title,
      body: input.body,
      color: input.color,
      deadline: input.deadline,
      columnId,
      boardId,
      position,
      updatedAt: new Date(),
    })
    .where(and(eq(organiserCards.id, input.cardId), eq(organiserCards.userId, userId)))
    .returning({
      id: organiserCards.id,
      columnId: organiserCards.columnId,
      title: organiserCards.title,
      body: organiserCards.body,
      color: organiserCards.color,
      deadline: organiserCards.deadline,
      position: organiserCards.position,
    });

  const card = updated[0];
  if (!card) throw new Error("Failed to update card");

  // Reconcile the card's tag join rows: clear then re-insert the (user-owned) set.
  await db.delete(organiserCardTags).where(eq(organiserCardTags.cardId, input.cardId));
  if (input.tagIds.length > 0) {
    const owned = await db
      .select({ id: organiserTags.id })
      .from(organiserTags)
      .where(and(inArray(organiserTags.id, input.tagIds), eq(organiserTags.userId, userId)));
    const ownedIds = new Set(owned.map((t) => t.id));
    const rows = input.tagIds
      .filter((id) => ownedIds.has(id))
      .map((tagId) => ({ cardId: input.cardId, tagId }));
    if (rows.length > 0) {
      await db.insert(organiserCardTags).values(rows).onConflictDoNothing();
    }
  }

  return card;
}

export async function deleteCardAction(input: { cardId: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .delete(organiserCards)
    .where(and(eq(organiserCards.id, input.cardId), eq(organiserCards.userId, userId)));
}

export async function moveCardAction(input: {
  cardId: string;
  toColumnId: string;
  position: string;
}): Promise<void> {
  const userId = await getUserId();

  // Verify the target column belongs to the user and grab its board.
  const columns = await db
    .select({ boardId: organiserColumns.boardId })
    .from(organiserColumns)
    .where(and(eq(organiserColumns.id, input.toColumnId), eq(organiserColumns.userId, userId)))
    .limit(1);
  const column = columns[0];
  if (!column) throw new Error("Column not found");

  await db
    .update(organiserCards)
    .set({
      columnId: input.toColumnId,
      boardId: column.boardId,
      position: input.position,
      updatedAt: new Date(),
    })
    .where(and(eq(organiserCards.id, input.cardId), eq(organiserCards.userId, userId)));
}

export async function createColumnAction(input: {
  boardId: string;
  name: string;
}): Promise<ColumnRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();

  // Verify the board belongs to the user.
  const boards = await db
    .select({ id: organiserBoards.id })
    .from(organiserBoards)
    .where(and(eq(organiserBoards.id, input.boardId), eq(organiserBoards.userId, userId)))
    .limit(1);
  if (!boards[0]) throw new Error("Board not found");

  // Append after the board's current last column.
  const last = await db
    .select({ position: organiserColumns.position })
    .from(organiserColumns)
    .where(and(eq(organiserColumns.boardId, input.boardId), eq(organiserColumns.userId, userId)))
    .orderBy(desc(organiserColumns.position))
    .limit(1);
  const position = keyAfter(last[0]?.position ?? null);

  const inserted = await db
    .insert(organiserColumns)
    .values({ userId, boardId: input.boardId, name, position })
    .returning({
      id: organiserColumns.id,
      name: organiserColumns.name,
      color: organiserColumns.color,
      position: organiserColumns.position,
      collapsed: organiserColumns.collapsed,
    });

  const column = inserted[0];
  if (!column) throw new Error("Failed to create column");
  return column;
}

export async function updateColumnAction(input: {
  columnId: string;
  name: string;
  color: string | null;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await getUserId();
  await db
    .update(organiserColumns)
    .set({ name, color: input.color, updatedAt: new Date() })
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)));
}

export async function setColumnCollapsedAction(input: {
  columnId: string;
  collapsed: boolean;
}): Promise<void> {
  const userId = await getUserId();
  await db
    .update(organiserColumns)
    .set({ collapsed: input.collapsed, updatedAt: new Date() })
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)));
}

export async function moveColumnAction(input: {
  columnId: string;
  position: string;
}): Promise<void> {
  const userId = await getUserId();
  await db
    .update(organiserColumns)
    .set({ position: input.position, updatedAt: new Date() })
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)));
}

type DeleteColumnInput =
  | { columnId: string; mode: "delete-cards" }
  | { columnId: string; mode: "move-cards"; targetColumnId: string };

export async function deleteColumnAction(
  input: DeleteColumnInput
): Promise<{ movedCards: CardRow[] }> {
  const userId = await getUserId();

  // Resolve the column being deleted (and its board), scoped to the user.
  const source = await db
    .select({ boardId: organiserColumns.boardId })
    .from(organiserColumns)
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)))
    .limit(1);
  const sourceColumn = source[0];
  if (!sourceColumn) throw new Error("Column not found");

  // Never delete the last remaining column on the board.
  const siblings = await db
    .select({ id: organiserColumns.id })
    .from(organiserColumns)
    .where(
      and(eq(organiserColumns.boardId, sourceColumn.boardId), eq(organiserColumns.userId, userId))
    );
  if (siblings.length <= 1) throw new Error("Cannot delete the last column");

  const movedCards: CardRow[] = [];

  if (input.mode === "move-cards") {
    // Verify the target belongs to the user and the same board.
    const target = await db
      .select({ id: organiserColumns.id })
      .from(organiserColumns)
      .where(
        and(
          eq(organiserColumns.id, input.targetColumnId),
          eq(organiserColumns.userId, userId),
          eq(organiserColumns.boardId, sourceColumn.boardId)
        )
      )
      .limit(1);
    if (!target[0]) throw new Error("Target column not found");
    if (input.targetColumnId === input.columnId) {
      throw new Error("Target column must differ from the column being deleted");
    }

    // Cards to move, in their current order.
    const cards = await db
      .select({ id: organiserCards.id })
      .from(organiserCards)
      .where(and(eq(organiserCards.columnId, input.columnId), eq(organiserCards.userId, userId)))
      .orderBy(asc(organiserCards.position), asc(organiserCards.id));

    // Append after the target's current last card, keeping order.
    const targetLast = await db
      .select({ position: organiserCards.position })
      .from(organiserCards)
      .where(
        and(eq(organiserCards.columnId, input.targetColumnId), eq(organiserCards.userId, userId))
      )
      .orderBy(desc(organiserCards.position))
      .limit(1);

    let prev = targetLast[0]?.position ?? null;
    for (const card of cards) {
      const position = keyAfter(prev);
      const updated = await db
        .update(organiserCards)
        .set({
          columnId: input.targetColumnId,
          position,
          updatedAt: new Date(),
        })
        .where(and(eq(organiserCards.id, card.id), eq(organiserCards.userId, userId)))
        .returning({
          id: organiserCards.id,
          columnId: organiserCards.columnId,
          title: organiserCards.title,
          body: organiserCards.body,
          color: organiserCards.color,
          deadline: organiserCards.deadline,
          position: organiserCards.position,
        });
      if (updated[0]) movedCards.push(updated[0]);
      prev = position;
    }
  }

  // Deleting the column cascades to its cards (any remaining, i.e. the
  // delete-cards mode); moved cards now live on the target column.
  await db
    .delete(organiserColumns)
    .where(and(eq(organiserColumns.id, input.columnId), eq(organiserColumns.userId, userId)));

  return { movedCards };
}

// ─── Tags ──────────────────────────────────────────────────────────

/**
 * Creates a per-user tag, or returns the existing one with the same name
 * (the `(userId, name)` uniqueness constraint). Used both by the management
 * surface and by the inline "create on the fly" flow when tagging a card.
 */
export async function createTagAction(input: {
  name: string;
  color?: string;
}): Promise<TagRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Tag name is required");

  const userId = await getUserId();
  const color = input.color ?? DEFAULT_TAG_COLOR;

  const inserted = await db
    .insert(organiserTags)
    .values({ userId, name, color })
    .onConflictDoNothing()
    .returning({ id: organiserTags.id, name: organiserTags.name, color: organiserTags.color });
  if (inserted[0]) return inserted[0];

  // Conflict → the tag already exists for this user; return it.
  const existing = await db
    .select({ id: organiserTags.id, name: organiserTags.name, color: organiserTags.color })
    .from(organiserTags)
    .where(and(eq(organiserTags.userId, userId), eq(organiserTags.name, name)))
    .limit(1);
  if (!existing[0]) throw new Error("Could not create tag");
  return existing[0];
}

export async function updateTagAction(input: {
  tagId: string;
  name: string;
  color: string;
}): Promise<TagRow> {
  const name = input.name.trim();
  if (!name) throw new Error("Tag name is required");

  const userId = await getUserId();

  try {
    const updated = await db
      .update(organiserTags)
      .set({ name, color: input.color })
      .where(and(eq(organiserTags.id, input.tagId), eq(organiserTags.userId, userId)))
      .returning({ id: organiserTags.id, name: organiserTags.name, color: organiserTags.color });
    if (!updated[0]) throw new Error("Tag not found");
    return updated[0];
  } catch (err) {
    if (isUniqueViolation(err)) throw new Error("You already have a tag with that name");
    throw err;
  }
}

export async function deleteTagAction(input: { tagId: string }): Promise<void> {
  const userId = await getUserId();
  // The card_tags join rows drop via the FK cascade; cards are untouched.
  await db
    .delete(organiserTags)
    .where(and(eq(organiserTags.id, input.tagId), eq(organiserTags.userId, userId)));
}
