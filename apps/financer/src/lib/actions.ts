"use server";

import { auth } from "@jf/auth";
import {
  db,
  financerAssetEntries,
  financerAssetSources,
  financerAssetSummaries,
  financerEntries,
  financerIncomeEntries,
  financerIncomeSources,
  financerIncomeSummaries,
  financerSpendingCategories,
  financerSummaries,
  financerUserSettings,
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
  currency: string;
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
    currency: data.currency,
  });
  revalidatePath("/", "layout");
}

export async function updateSpendingEntry(
  id: string,
  data: { category: string; currency: string; value: string }
): Promise<void> {
  if (!data.category.trim()) throw new Error("Category is required");
  const numericValue = Number(data.value);
  if (!numericValue || numericValue <= 0) throw new Error("Value must be a positive number");
  const userId = await getAuthUserId();
  await db
    .update(financerEntries)
    .set({
      category: data.category,
      currency: data.currency,
      value: data.value,
      updatedAt: new Date(),
    })
    .where(and(eq(financerEntries.id, id), eq(financerEntries.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteSpendingEntry(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(financerEntries)
    .where(and(eq(financerEntries.id, id), eq(financerEntries.userId, userId)));
  revalidatePath("/", "layout");
}

// ─── Spending category actions ────────────────────────────────────────────────

export async function createSpendingCategory(data: { name: string }): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  await db.insert(financerSpendingCategories).values({
    userId,
    name: data.name.trim(),
  });
  revalidatePath("/", "layout");
}

export async function updateSpendingCategory(id: string, data: { name: string }): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  const [existing] = await db
    .select({ name: financerSpendingCategories.name })
    .from(financerSpendingCategories)
    .where(
      and(eq(financerSpendingCategories.id, id), eq(financerSpendingCategories.userId, userId))
    );
  if (!existing) throw new Error("Category not found");
  const newName = data.name.trim();
  await withTransaction(async (tx) => {
    await tx
      .update(financerSpendingCategories)
      .set({ name: newName, updatedAt: new Date() })
      .where(
        and(eq(financerSpendingCategories.id, id), eq(financerSpendingCategories.userId, userId))
      );
    if (existing.name !== newName) {
      await tx
        .update(financerEntries)
        .set({ category: newName, updatedAt: new Date() })
        .where(
          and(eq(financerEntries.userId, userId), eq(financerEntries.category, existing.name))
        );
    }
  });
  revalidatePath("/", "layout");
}

export async function deleteSpendingCategory(id: string): Promise<void> {
  const userId = await getAuthUserId();
  const [category] = await db
    .select({ name: financerSpendingCategories.name })
    .from(financerSpendingCategories)
    .where(
      and(eq(financerSpendingCategories.id, id), eq(financerSpendingCategories.userId, userId))
    );
  if (!category) throw new Error("Category not found");
  const [entryUsing] = await db
    .select({ id: financerEntries.id })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.category, category.name)))
    .limit(1);
  if (entryUsing) throw new Error("This category has transactions assigned to it");
  const [summaryUsing] = await db
    .select({ id: financerSummaries.id })
    .from(financerSummaries)
    .where(and(eq(financerSummaries.userId, userId), eq(financerSummaries.category, category.name)))
    .limit(1);
  if (summaryUsing) throw new Error("This category has transactions assigned to it");
  await db
    .delete(financerSpendingCategories)
    .where(
      and(eq(financerSpendingCategories.id, id), eq(financerSpendingCategories.userId, userId))
    );
  revalidatePath("/", "layout");
}

// ─── Asset actions ────────────────────────────────────────────────────────────

export async function createAssetSource(data: {
  name: string;
  currency: string;
}): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  if (!data.currency.trim()) throw new Error("Currency is required");
  const userId = await getAuthUserId();
  await db.insert(financerAssetSources).values({
    userId,
    name: data.name.trim(),
    currency: data.currency.trim().toUpperCase(),
  });
  revalidatePath("/", "layout");
}

export async function updateAssetSource(
  id: string,
  data: { name: string; currency: string }
): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  if (!data.currency.trim()) throw new Error("Currency is required");
  const userId = await getAuthUserId();
  await db
    .update(financerAssetSources)
    .set({
      name: data.name.trim(),
      currency: data.currency.trim().toUpperCase(),
      updatedAt: new Date(),
    })
    .where(and(eq(financerAssetSources.id, id), eq(financerAssetSources.userId, userId)));
  revalidatePath("/", "layout");
}

export async function updateAssetSourceColor(id: string, color: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(financerAssetSources)
    .set({ color, updatedAt: new Date() })
    .where(and(eq(financerAssetSources.id, id), eq(financerAssetSources.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteAssetSource(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(financerAssetSources)
    .where(and(eq(financerAssetSources.id, id), eq(financerAssetSources.userId, userId)));
  revalidatePath("/", "layout");
}

export async function addAssetEntry(sourceId: string, month: string, value: string): Promise<void> {
  const numericValue = Number(value);
  if (!numericValue || numericValue <= 0) throw new Error("Value must be a positive number");
  const userId = await getAuthUserId();
  await db.insert(financerAssetEntries).values({ userId, sourceId, value, month });
  revalidatePath("/", "layout");
}

export async function updateAssetEntry(id: string, value: string): Promise<void> {
  const numericValue = Number(value);
  if (!numericValue || numericValue <= 0) throw new Error("Value must be a positive number");
  const userId = await getAuthUserId();
  await db
    .update(financerAssetEntries)
    .set({ value, updatedAt: new Date() })
    .where(and(eq(financerAssetEntries.id, id), eq(financerAssetEntries.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteAssetEntry(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(financerAssetEntries)
    .where(and(eq(financerAssetEntries.id, id), eq(financerAssetEntries.userId, userId)));
  revalidatePath("/", "layout");
}

// ─── Income actions ───────────────────────────────────────────────────────────

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

export async function updateIncomeSourceColor(id: string, color: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .update(financerIncomeSources)
    .set({ color, updatedAt: new Date() })
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

export async function addIncomeEntry(
  sourceId: string,
  month: string,
  value: string
): Promise<void> {
  const numericValue = Number(value);
  if (!value.trim() || Number.isNaN(numericValue)) throw new Error("Value must be a valid number");
  const userId = await getAuthUserId();
  await db.insert(financerIncomeEntries).values({ userId, sourceId, value, month });
  revalidatePath("/", "layout");
}

export async function updateIncomeEntry(id: string, value: string): Promise<void> {
  const numericValue = Number(value);
  if (!value.trim() || Number.isNaN(numericValue)) throw new Error("Value must be a valid number");
  const userId = await getAuthUserId();
  await db
    .update(financerIncomeEntries)
    .set({ value, updatedAt: new Date() })
    .where(and(eq(financerIncomeEntries.id, id), eq(financerIncomeEntries.userId, userId)));
  revalidatePath("/", "layout");
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .delete(financerIncomeEntries)
    .where(and(eq(financerIncomeEntries.id, id), eq(financerIncomeEntries.userId, userId)));
  revalidatePath("/", "layout");
}

export async function setHomeCurrency(currency: string): Promise<void> {
  const userId = await getAuthUserId();
  await db
    .insert(financerUserSettings)
    .values({ userId, homeCurrency: currency, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: financerUserSettings.userId,
      set: { homeCurrency: currency, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
}

export async function closeMonth(month: string): Promise<void> {
  const userId = await getAuthUserId();

  const entries = await db
    .select({
      category: financerEntries.category,
      currency: financerEntries.currency,
      value: financerEntries.value,
    })
    .from(financerEntries)
    .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));

  if (entries.length === 0) throw new Error("No open entries for this month");

  const totals = new Map<string, { currency: string; total: number }>();
  for (const row of entries) {
    const key = `${row.category}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { currency: row.currency, total: Number(row.value) });
    }
  }

  await withTransaction(async (tx) => {
    await tx.insert(financerSummaries).values(
      Array.from(totals.entries()).map(([key, { currency, total }]) => {
        const category = key.split("::")[0]!;
        return { userId, category, currency, value: String(total), month };
      })
    );
    await tx
      .delete(financerEntries)
      .where(and(eq(financerEntries.userId, userId), eq(financerEntries.month, month)));
  });

  revalidatePath("/", "layout");
}

export async function closeIncomeMonth(month: string): Promise<void> {
  const userId = await getAuthUserId();

  const entries = await db
    .select({
      name: financerIncomeSources.name,
      currency: financerIncomeSources.currency,
      value: financerIncomeEntries.value,
    })
    .from(financerIncomeEntries)
    .innerJoin(financerIncomeSources, eq(financerIncomeEntries.sourceId, financerIncomeSources.id))
    .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)));

  if (entries.length === 0) throw new Error("No open entries for this month");

  const totals = new Map<string, { name: string; currency: string; total: number }>();
  for (const row of entries) {
    const key = `${row.name}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { name: row.name, currency: row.currency, total: Number(row.value) });
    }
  }

  await withTransaction(async (tx) => {
    await tx.insert(financerIncomeSummaries).values(
      Array.from(totals.values()).map(({ name, currency, total }) => ({
        userId,
        name,
        currency,
        value: String(total),
        month,
      }))
    );
    await tx
      .delete(financerIncomeEntries)
      .where(and(eq(financerIncomeEntries.userId, userId), eq(financerIncomeEntries.month, month)));
  });

  revalidatePath("/", "layout");
}

export async function closeAssetMonth(month: string): Promise<void> {
  const userId = await getAuthUserId();

  const entries = await db
    .select({
      name: financerAssetSources.name,
      currency: financerAssetSources.currency,
      value: financerAssetEntries.value,
    })
    .from(financerAssetEntries)
    .innerJoin(financerAssetSources, eq(financerAssetEntries.sourceId, financerAssetSources.id))
    .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)));

  if (entries.length === 0) throw new Error("No open entries for this month");

  const totals = new Map<string, { name: string; currency: string; total: number }>();
  for (const row of entries) {
    const key = `${row.name}::${row.currency}`;
    const existing = totals.get(key);
    if (existing) {
      existing.total += Number(row.value);
    } else {
      totals.set(key, { name: row.name, currency: row.currency, total: Number(row.value) });
    }
  }

  await withTransaction(async (tx) => {
    await tx.insert(financerAssetSummaries).values(
      Array.from(totals.values()).map(({ name, currency, total }) => ({
        userId,
        name,
        currency,
        value: String(total),
        month,
      }))
    );
    await tx
      .delete(financerAssetEntries)
      .where(and(eq(financerAssetEntries.userId, userId), eq(financerAssetEntries.month, month)));
  });

  revalidatePath("/", "layout");
}
