"use server";

import { auth } from "@jf/auth";
import {
  db,
  exposerItemTags,
  exposerItems,
  exposerPhotos,
  exposerTags,
  withTransaction,
} from "@jf/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { deleteS3Object, generatePresignedUploadUrl } from "./s3";
import { getPublicImageUrl } from "./s3-url";
import { resolveTagIds } from "./tags";

type Visibility = "public" | "draft";

/** A photo as submitted by the modal, in display order (position = array index). */
export type PhotoInput = { storageKey: string; width: number; height: number };

export type EditPhoto = {
  id: string;
  storageKey: string;
  url: string;
  width: number;
  height: number;
};

export type EditItem = {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  visibility: Visibility;
  photos: EditPhoto[];
  tags: string[];
};

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function generatePresignedUploadUrlAction(
  filename: string
): Promise<{ key: string; url: string }> {
  return generatePresignedUploadUrl(filename);
}

export async function createItemAction(input: {
  title: string | null;
  description: string | null;
  date: string;
  visibility: Visibility;
  photos: PhotoInput[];
  tags: string[];
}): Promise<void> {
  const userId = await requireUserId();
  if (input.photos.length === 0) throw new Error("An item needs at least one photo.");

  // Tags are resolved (create-or-reuse) up front; independent of the item transaction.
  const tagIds = await resolveTagIds(userId, input.tags);

  await withTransaction(async (tx) => {
    const [item] = await tx
      .insert(exposerItems)
      .values({
        userId,
        title: input.title,
        description: input.description,
        date: input.date,
        visibility: input.visibility,
      })
      .returning({ id: exposerItems.id });
    if (!item) throw new Error("Failed to create item.");

    await tx.insert(exposerPhotos).values(
      input.photos.map((p, i) => ({
        itemId: item.id,
        storageKey: p.storageKey,
        position: i,
        width: p.width,
        height: p.height,
      }))
    );

    if (tagIds.length > 0) {
      await tx.insert(exposerItemTags).values(tagIds.map((tagId) => ({ itemId: item.id, tagId })));
    }
  });
}

export async function updateItemAction(input: {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  visibility: Visibility;
  photos: PhotoInput[];
  tags: string[];
}): Promise<void> {
  const userId = await requireUserId();
  if (input.photos.length === 0) throw new Error("An item needs at least one photo.");

  // Ownership check.
  const [existing] = await db
    .select({ id: exposerItems.id })
    .from(exposerItems)
    .where(and(eq(exposerItems.id, input.id), eq(exposerItems.userId, userId)))
    .limit(1);
  if (!existing) throw new Error("Item not found.");

  const tagIds = await resolveTagIds(userId, input.tags);

  const existingKeys = (
    await db
      .select({ storageKey: exposerPhotos.storageKey })
      .from(exposerPhotos)
      .where(eq(exposerPhotos.itemId, input.id))
  ).map((r) => r.storageKey);

  await withTransaction(async (tx) => {
    await tx
      .update(exposerItems)
      .set({
        title: input.title,
        description: input.description,
        date: input.date,
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(exposerItems.id, input.id));

    // Replace-all: simplest correct handling of add/remove/reorder together.
    await tx.delete(exposerPhotos).where(eq(exposerPhotos.itemId, input.id));
    await tx.insert(exposerPhotos).values(
      input.photos.map((p, i) => ({
        itemId: input.id,
        storageKey: p.storageKey,
        position: i,
        width: p.width,
        height: p.height,
      }))
    );

    // Replace-all the tag assignments.
    await tx.delete(exposerItemTags).where(eq(exposerItemTags.itemId, input.id));
    if (tagIds.length > 0) {
      await tx.insert(exposerItemTags).values(tagIds.map((tagId) => ({ itemId: input.id, tagId })));
    }
  });

  // Delete bucket objects only for photos that were removed (kept keys stay).
  const submittedKeys = new Set(input.photos.map((p) => p.storageKey));
  for (const key of existingKeys) {
    if (!submittedKeys.has(key)) await deleteS3Object(key);
  }
}

export async function deleteItemAction(id: string): Promise<void> {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: exposerItems.id })
    .from(exposerItems)
    .where(and(eq(exposerItems.id, id), eq(exposerItems.userId, userId)))
    .limit(1);
  if (!existing) throw new Error("Item not found.");

  const keys = (
    await db
      .select({ storageKey: exposerPhotos.storageKey })
      .from(exposerPhotos)
      .where(eq(exposerPhotos.itemId, id))
  ).map((r) => r.storageKey);

  // Deleting the item cascades to its photo rows (FK onDelete: cascade).
  await db.delete(exposerItems).where(eq(exposerItems.id, id));

  for (const key of keys) await deleteS3Object(key);
}

/** Ownership-checked full item for pre-populating the edit modal. */
export async function getItemForEdit(id: string): Promise<EditItem | null> {
  const userId = await requireUserId();

  const [item] = await db
    .select({
      id: exposerItems.id,
      title: exposerItems.title,
      description: exposerItems.description,
      date: exposerItems.date,
      visibility: exposerItems.visibility,
    })
    .from(exposerItems)
    .where(and(eq(exposerItems.id, id), eq(exposerItems.userId, userId)))
    .limit(1);
  if (!item) return null;

  const photos = await db
    .select({
      id: exposerPhotos.id,
      storageKey: exposerPhotos.storageKey,
      width: exposerPhotos.width,
      height: exposerPhotos.height,
    })
    .from(exposerPhotos)
    .where(eq(exposerPhotos.itemId, id))
    .orderBy(exposerPhotos.position);

  const tags = (
    await db
      .select({ name: exposerTags.name })
      .from(exposerItemTags)
      .innerJoin(exposerTags, eq(exposerItemTags.tagId, exposerTags.id))
      .where(eq(exposerItemTags.itemId, id))
  ).map((t) => t.name);

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    date: item.date,
    visibility: item.visibility,
    photos: photos.map((p) => ({
      id: p.id,
      storageKey: p.storageKey,
      url: getPublicImageUrl(p.storageKey),
      width: p.width,
      height: p.height,
    })),
    tags,
  };
}
