import { auth } from "@jf/auth";
import { db, notes, reminders } from "@jf/db";
import { and, asc, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const due = await db
    .select({
      id: reminders.id,
      noteId: reminders.noteId,
      blockId: reminders.blockId,
      title: reminders.title,
      scheduledAt: reminders.scheduledAt,
      repeatRule: reminders.repeatRule,
      noteTitle: notes.title,
    })
    .from(reminders)
    .innerJoin(notes, eq(reminders.noteId, notes.id))
    .where(
      and(
        eq(reminders.userId, session.user.id),
        lte(reminders.scheduledAt, new Date()),
        eq(reminders.isDone, false)
      )
    )
    .orderBy(asc(reminders.scheduledAt));

  return NextResponse.json(due);
}
