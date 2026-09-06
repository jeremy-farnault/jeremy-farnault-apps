import { db, organiserBoards, organiserCards, organiserColumns, withTransaction } from "@jf/db";
import { and, asc, eq } from "drizzle-orm";

import { seedKeys } from "./ordering";

export type ColumnRow = {
  id: string;
  name: string;
  color: string | null;
  position: string;
  collapsed: boolean;
};

export type CardRow = {
  id: string;
  columnId: string;
  title: string;
  position: string;
};

export type BoardData = {
  boardId: string;
  columns: ColumnRow[];
  cards: CardRow[];
};

const SEED_COLUMN_NAMES = ["To Do", "In Progress", "Done"] as const;

/**
 * Returns the user's board (creating and seeding it on first visit) together
 * with its columns and cards. Always resolves the earliest board, so a rare
 * concurrent double-create still renders deterministically.
 */
export async function getOrCreateBoard(userId: string): Promise<BoardData> {
  const boardId = await withTransaction(async (tx) => {
    const existing = await tx
      .select({ id: organiserBoards.id })
      .from(organiserBoards)
      .where(eq(organiserBoards.userId, userId))
      .orderBy(asc(organiserBoards.createdAt))
      .limit(1);

    if (existing[0]) return existing[0].id;

    const inserted = await tx
      .insert(organiserBoards)
      .values({ userId })
      .returning({ id: organiserBoards.id });
    const newBoardId = inserted[0]?.id;
    if (!newBoardId) throw new Error("Failed to create board");

    const positions = seedKeys(SEED_COLUMN_NAMES.length);
    await tx.insert(organiserColumns).values(
      SEED_COLUMN_NAMES.map((name, i) => ({
        boardId: newBoardId,
        userId,
        name,
        position: positions[i] as string,
      }))
    );

    return newBoardId;
  });

  const [columns, cards] = await Promise.all([
    db
      .select({
        id: organiserColumns.id,
        name: organiserColumns.name,
        color: organiserColumns.color,
        position: organiserColumns.position,
        collapsed: organiserColumns.collapsed,
      })
      .from(organiserColumns)
      .where(and(eq(organiserColumns.userId, userId), eq(organiserColumns.boardId, boardId)))
      .orderBy(asc(organiserColumns.position)),
    db
      .select({
        id: organiserCards.id,
        columnId: organiserCards.columnId,
        title: organiserCards.title,
        position: organiserCards.position,
      })
      .from(organiserCards)
      .where(and(eq(organiserCards.userId, userId), eq(organiserCards.boardId, boardId)))
      .orderBy(asc(organiserCards.position), asc(organiserCards.id)),
  ]);

  return { boardId, columns, cards };
}
