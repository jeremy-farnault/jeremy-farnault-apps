import { db, notes, pushSubscriptions, reminders } from "@jf/db";
import { and, eq, inArray, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:no-reply@jeremyfarnault.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

function nextScheduledAt(scheduledAt: Date, repeatRule: string): Date {
  const next = new Date(scheduledAt);
  switch (repeatRule) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const dueReminders = await db
    .select({
      id: reminders.id,
      userId: reminders.userId,
      noteId: reminders.noteId,
      title: reminders.title,
      repeatRule: reminders.repeatRule,
      scheduledAt: reminders.scheduledAt,
      noteTitle: notes.title,
    })
    .from(reminders)
    .innerJoin(notes, eq(reminders.noteId, notes.id))
    .where(and(lte(reminders.scheduledAt, now), eq(reminders.isDone, false)));

  const userIds = [...new Set(dueReminders.map((r) => r.userId))];
  const allSubscriptions = userIds.length
    ? await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds))
    : [];
  const subscriptionsByUser = new Map<string, typeof allSubscriptions>();
  for (const sub of allSubscriptions) {
    const list = subscriptionsByUser.get(sub.userId) ?? [];
    list.push(sub);
    subscriptionsByUser.set(sub.userId, list);
  }

  for (const reminder of dueReminders) {
    const subscriptions = subscriptionsByUser.get(reminder.userId) ?? [];

    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.noteTitle ?? "",
      noteId: reminder.noteId,
      url: `/note/${reminder.noteId}`,
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: unknown) {
        if ((err as { statusCode?: number }).statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[cron] Push failed for subscription ${sub.id}:`, err);
        }
      }
    }

    if (reminder.repeatRule === "NONE") {
      await db
        .update(reminders)
        .set({ isDone: true, firedAt: now, updatedAt: now })
        .where(eq(reminders.id, reminder.id));
    } else {
      await db
        .update(reminders)
        .set({
          scheduledAt: nextScheduledAt(reminder.scheduledAt, reminder.repeatRule),
          firedAt: now,
          updatedAt: now,
        })
        .where(eq(reminders.id, reminder.id));
    }
  }

  return NextResponse.json({ ok: true, processed: dueReminders.length });
}
