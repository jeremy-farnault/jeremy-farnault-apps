"use server";

import type { ClasserCardData } from "@/components/classer-card";
import { auth } from "@jf/auth";
import { classerItems, db } from "@jf/db";
import { and, eq, gt, gte, lt, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  archiveClasserById,
  deleteClasserById,
  getClasserById,
  insertClasser,
  restoreClasserById,
  updateClasserById,
} from "./classer-mutations";
import { getClasserItemById, updateClasserItemById } from "./item-mutations";
import type { ClasserCursor, ClasserRow } from "./queries";
import { getArchivedClassers, getClassers, searchClassers } from "./queries";
import { deleteS3Object, generatePresignedUploadUrl } from "./s3";
import { getPublicImageUrl } from "./s3-url";

export type ClasserResult = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
};

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function generatePresignedUploadUrlAction(
  filename: string
): Promise<{ key: string; url: string }> {
  return generatePresignedUploadUrl(filename);
}

export async function createClasserAction(input: {
  name: string;
  description: string | null;
  imageKey: string | null;
}): Promise<ClasserResult> {
  const userId = await getUserId();
  const { id } = await insertClasser(userId, input);
  return {
    id,
    name: input.name,
    description: input.description,
    imageKey: input.imageKey,
    imageUrl: input.imageKey ? getPublicImageUrl(input.imageKey) : null,
  };
}

// ─── Read actions ─────────────────────────────────────────────────────────────

function toCardClasser(row: ClasserRow): ClasserCardData {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageKey: row.imageKey,
    imageUrl: row.imageKey ? getPublicImageUrl(row.imageKey) : null,
    itemCount: row.itemCount,
  };
}

export async function fetchClassersAction(
  cursor: ClasserCursor | null
): Promise<{ classers: ClasserCardData[]; nextCursor: ClasserCursor | null }> {
  const userId = await getUserId();
  const { classers, nextCursor } = await getClassers(userId, cursor);
  return { classers: classers.map(toCardClasser), nextCursor };
}

export async function searchClassersAction(query: string): Promise<ClasserCardData[]> {
  if (!query.trim()) return [];
  const userId = await getUserId();
  const results = await searchClassers(userId, query.trim());
  return results.map(toCardClasser);
}

export async function archiveClasserAction(id: string): Promise<void> {
  const userId = await getUserId();
  await archiveClasserById(userId, id);
  revalidatePath("/", "layout");
}

export async function restoreClasserAction(id: string): Promise<void> {
  const userId = await getUserId();
  await restoreClasserById(userId, id);
  revalidatePath("/", "layout");
}

export async function deleteClasserAction(id: string): Promise<void> {
  const userId = await getUserId();
  const existing = await getClasserById(userId, id);
  if (!existing) return;

  const items = await db
    .select({ imageKey: classerItems.imageKey })
    .from(classerItems)
    .where(eq(classerItems.classerId, id));

  await Promise.all([
    existing.imageKey ? deleteS3Object(existing.imageKey) : Promise.resolve(),
    ...items.filter((i) => i.imageKey).map((i) => deleteS3Object(i.imageKey!)),
  ]);

  await deleteClasserById(userId, id);
  revalidatePath("/", "layout");
}

export async function fetchArchivedClassersAction(): Promise<ClasserCardData[]> {
  const userId = await getUserId();
  const results = await getArchivedClassers(userId);
  return results.map(toCardClasser);
}

// ─── Write actions ────────────────────────────────────────────────────────────

export async function updateClasserAction(input: {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  removeImage: boolean;
}): Promise<ClasserResult> {
  const userId = await getUserId();
  const existing = await getClasserById(userId, input.id);
  if (!existing) throw new Error("Classer not found");

  let newImageKey = input.imageKey;

  if (input.removeImage && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
    newImageKey = null;
  } else if (input.imageKey && input.imageKey !== existing.imageKey && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
  }

  await updateClasserById(userId, input.id, {
    name: input.name,
    description: input.description,
    imageKey: newImageKey,
  });

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    imageKey: newImageKey,
    imageUrl: newImageKey ? getPublicImageUrl(newImageKey) : null,
  };
}

// ─── Item actions ─────────────────────────────────────────────────────────────

export type ItemResult = {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  imageUrl: string | null;
  rank: number;
};

export async function createItemAction(input: {
  classerId: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  rank: number;
  itemCount: number;
}): Promise<ItemResult> {
  const userId = await getUserId();

  const { id } = await db.transaction(async (tx) => {
    await tx
      .update(classerItems)
      .set({ rank: sql`${classerItems.rank} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(classerItems.classerId, input.classerId),
          eq(classerItems.userId, userId),
          gte(classerItems.rank, input.rank)
        )
      );

    const rows = await tx
      .insert(classerItems)
      .values({
        userId,
        classerId: input.classerId,
        name: input.name,
        description: input.description,
        imageKey: input.imageKey,
        rank: input.rank,
      })
      .returning({ id: classerItems.id });

    const row = rows[0];
    if (!row) throw new Error("Insert failed to return a row");
    return row;
  });

  revalidatePath(`/classers/${input.classerId}`);

  return {
    id,
    name: input.name,
    description: input.description,
    imageKey: input.imageKey,
    imageUrl: input.imageKey ? getPublicImageUrl(input.imageKey) : null,
    rank: input.rank,
  };
}

export async function updateItemAction(input: {
  id: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  removeImage: boolean;
  rank: number;
  itemCount: number;
}): Promise<ItemResult> {
  const userId = await getUserId();
  const existing = await getClasserItemById(userId, input.id);
  if (!existing) throw new Error("Item not found");

  let newImageKey = input.imageKey;

  if (input.removeImage && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
    newImageKey = null;
  } else if (input.imageKey && input.imageKey !== existing.imageKey && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
  }

  if (input.rank === existing.rank) {
    await updateClasserItemById(userId, input.id, {
      name: input.name,
      description: input.description,
      imageKey: newImageKey,
      rank: existing.rank,
    });
    revalidatePath(`/classers/${existing.classerId}`);
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      imageKey: newImageKey,
      imageUrl: newImageKey ? getPublicImageUrl(newImageKey) : null,
      rank: existing.rank,
    };
  }

  if (input.rank < 1 || input.rank > input.itemCount) {
    return {
      id: input.id,
      name: existing.name,
      description: existing.description,
      imageKey: existing.imageKey,
      imageUrl: existing.imageKey ? getPublicImageUrl(existing.imageKey) : null,
      rank: existing.rank,
    };
  }

  const rankA = existing.rank;
  const rankB = input.rank;

  await db.transaction(async (tx) => {
    await tx
      .update(classerItems)
      .set({ rank: -1, updatedAt: new Date() })
      .where(and(eq(classerItems.id, input.id), eq(classerItems.userId, userId)));

    if (rankB < rankA) {
      await tx
        .update(classerItems)
        .set({ rank: sql`${classerItems.rank} + 1`, updatedAt: new Date() })
        .where(
          and(
            eq(classerItems.classerId, existing.classerId),
            eq(classerItems.userId, userId),
            gte(classerItems.rank, rankB),
            lt(classerItems.rank, rankA)
          )
        );
    } else {
      await tx
        .update(classerItems)
        .set({ rank: sql`${classerItems.rank} - 1`, updatedAt: new Date() })
        .where(
          and(
            eq(classerItems.classerId, existing.classerId),
            eq(classerItems.userId, userId),
            gt(classerItems.rank, rankA),
            lte(classerItems.rank, rankB)
          )
        );
    }

    await tx
      .update(classerItems)
      .set({
        rank: rankB,
        name: input.name,
        description: input.description,
        imageKey: newImageKey,
        updatedAt: new Date(),
      })
      .where(and(eq(classerItems.id, input.id), eq(classerItems.userId, userId)));
  });

  revalidatePath(`/classers/${existing.classerId}`);

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    imageKey: newImageKey,
    imageUrl: newImageKey ? getPublicImageUrl(newImageKey) : null,
    rank: rankB,
  };
}

export async function deleteItemAction(input: { id: string; classerId: string }): Promise<void> {
  const userId = await getUserId();
  const existing = await getClasserItemById(userId, input.id);
  if (!existing) throw new Error("Item not found");

  if (existing.imageKey) await deleteS3Object(existing.imageKey);

  const deletedRank = existing.rank;

  await db.transaction(async (tx) => {
    await tx
      .delete(classerItems)
      .where(and(eq(classerItems.id, input.id), eq(classerItems.userId, userId)));

    await tx
      .update(classerItems)
      .set({ rank: sql`${classerItems.rank} - 1`, updatedAt: new Date() })
      .where(
        and(
          eq(classerItems.classerId, input.classerId),
          eq(classerItems.userId, userId),
          gt(classerItems.rank, deletedRank)
        )
      );
  });

  revalidatePath(`/classers/${input.classerId}`);
}
