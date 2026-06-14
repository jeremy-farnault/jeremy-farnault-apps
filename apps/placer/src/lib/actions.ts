"use server";

import { auth } from "@jf/auth";
import { db, placerCategories, placerSpots } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { generatePresignedUploadUrl } from "./s3";

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

export async function generatePresignedUploadUrlAction(
  filename: string
): Promise<{ key: string; url: string }> {
  return generatePresignedUploadUrl(filename);
}

export async function updateSpot(data: {
  id: string;
  name: string;
  lat: number;
  lng: number;
  categoryId: string | null;
  description: string | null;
  photoKey: string | null | undefined;
}): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  const setData: Record<string, unknown> = {
    name: data.name.trim(),
    lat: data.lat,
    lng: data.lng,
    categoryId: data.categoryId,
    description: data.description,
    updatedAt: new Date(),
  };
  if (data.photoKey !== undefined) setData.photoKey = data.photoKey;
  await db
    .update(placerSpots)
    .set(setData)
    .where(and(eq(placerSpots.id, data.id), eq(placerSpots.userId, userId)));
  revalidatePath("/", "layout");
}

export async function createSpot(data: {
  name: string;
  lat: number;
  lng: number;
  categoryId: string | null;
  description: string | null;
  photoKey: string | null;
}): Promise<void> {
  if (!data.name.trim()) throw new Error("Name is required");
  const userId = await getAuthUserId();
  await db.insert(placerSpots).values({
    userId,
    name: data.name.trim(),
    lat: data.lat,
    lng: data.lng,
    categoryId: data.categoryId,
    description: data.description,
    photoKey: data.photoKey,
  });
  revalidatePath("/", "layout");
}
