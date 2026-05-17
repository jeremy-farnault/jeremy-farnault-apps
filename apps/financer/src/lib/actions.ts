"use server";

import { auth } from "@jf/auth";
import {
  db,
  financerEntries,
  financerIncomeSources,
  financerSummaries,
  withTransaction,
} from "@jf/db";
import { and, eq } from "drizzle-orm";
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

export async function createIncomeSource(data: {
  name: string;
  currency: string;
}): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  if (!data.currency.trim()) throw new Error("Currency is required");
  const userId = await getAuthUserId();
  await db.insert(financerIncomeSources).values({
    userId,
    name: data.name.trim(),
    currency: data.currency.trim().toUpperCase(),
  });
  revalidatePath("/", "layout");
}

export async function updateIncomeSource(
  id: string,
  data: { name: string; currency: string }
): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  if (!data.currency.trim()) throw new Error("Currency is required");
  const userId = await getAuthUserId();
  await db
    .update(financerIncomeSources)
    .set({
      name: data.name.trim(),
      currency: data.currency.trim().toUpperCase(),
      updatedAt: new Date(),
    })
    .where(and(eq(financerIncomeSources.id, id), eq(financerIncomeSources.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteIncomeSource(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(financerIncomeSources)
    .where(and(eq(financerIncomeSources.id, id), eq(financerIncomeSources.userId, userId)));
  revalidatePath("/", "layout");
}

export async function closeMonth(month: string): Promise<void> {
  const userId = await getAuthUserId();

  const entries = await db
    .select({ category: financerEntries.category, value: financerEntries.value })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));

  if (entries.length === 0) throw new Error("No open entries for this month");

  const totals = new Map<string, number>();
  for (const row of entries) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + Number(row.value));
  }

  await withTransaction(async (tx) => {
    await tx.insert(financerSummaries).values(
      Array.from(totals.entries()).map(([category, total]) => ({
        userId,
        category,
        value: String(total),
        month,
      }))
    );
    await tx
      .delete(financerEntries)
      .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));
  });

  revalidatePath("/", "layout");
}
