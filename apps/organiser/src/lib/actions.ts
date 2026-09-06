"use server";

import { auth } from "@jf/auth";
import { db, organiserCards, organiserColumns } from "@jf/db";
import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { keyAfter } from "./ordering";
import type { CardRow } from "./queries";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
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
      position: organiserCards.position,
    });

  const card = inserted[0];
  if (!card) throw new Error("Failed to create card");
  return card;
}
