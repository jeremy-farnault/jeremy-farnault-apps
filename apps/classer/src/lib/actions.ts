"use server";

import type { ClasserCardData } from "@/components/classer-card";
import { auth } from "@jf/auth";
import { headers } from "next/headers";
import {
  archiveClasserById,
  deleteClasserById,
  getClasserById,
  insertClasser,
  updateClasserById,
} from "./classer-mutations";
import type { ClasserCursor, ClasserRow } from "./queries";
import { getClassers, searchClassers } from "./queries";
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
}

export async function deleteClasserAction(id: string): Promise<void> {
  const userId = await getUserId();
  const existing = await getClasserById(userId, id);
  if (existing?.imageKey) await deleteS3Object(existing.imageKey);
  await deleteClasserById(userId, id);
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
