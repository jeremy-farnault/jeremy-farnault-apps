import { auth } from "@jf/auth";
import { db, notes, reminders } from "@jf/db";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db
    .select({
      id: reminders.id,
      noteId: reminders.noteId,
      title: reminders.title,
      scheduledAt: reminders.scheduledAt,
      repeatRule: reminders.repeatRule,
      noteTitle: notes.title,
    })
    .from(reminders)
    .innerJoin(notes, eq(reminders.noteId, notes.id))
    .where(and(eq(reminders.userId, session.user.id), eq(reminders.isDone, false)))
    .orderBy(asc(reminders.scheduledAt));

  return NextResponse.json(all);
}
