"use server";

import { auth } from "@jf/auth";
import { db, financerEntries } from "@jf/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

async function getAuthUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createSpendingEntry(data: {
  category: string;
  value: string;
  month: string;
}): Promise<void> {
  if (!data.category.trim()) throw new Error("Category is required");
  const numericValue = Number(data.value);
  if (!numericValue || numericValue <= 0) throw new Error("Value must be a positive number");

  const userId = await getAuthUserId();
  await db.insert(financerEntries).values({
    userId,
    category: data.category,
    value: data.value,
    month: data.month,
  });
  revalidatePath("/", "layout");
}
