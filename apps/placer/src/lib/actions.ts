"use server";

import { auth } from "@jf/auth";
import { db, placerCategories } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createCategory(data: {
  name: string;
  color: string;
  icon: string;
}): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  await db.insert(placerCategories).values({
    userId,
    name: data.name.trim(),
    color: data.color,
    icon: data.icon,
  });
  revalidatePath("/", "layout");
}

export async function deleteCategory(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(placerCategories)
    .where(and(eq(placerCategories.id, id), eq(placerCategories.userId, userId)));
  revalidatePath("/", "layout");
}
