"use server";

import { auth } from "@jf/auth";
import { headers } from "next/headers";
import {
  DEFAULT_FILTERS,
  getCalendarDays,
  getCalendarMonths,
  getCalendarYears,
  getEntries,
  searchEntries,
  type EntryCursor,
  type EntryCategory,
  type FilterParams,
  type JournalerEntry,
} from "./queries";
import { deleteEntryById, getEntryById, insertEntry, updateEntryById } from "./entry-mutations";
import { deleteS3Object, generatePresignedUploadUrl } from "./s3";
import { getPublicImageUrl } from "./s3-url";
import type { CardEntry } from "@/components/entry-card";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

function toCardEntry(e: JournalerEntry): CardEntry {
  return {
    id: e.id,
    title: e.title,
    category: e.category,
    date: e.date,
    comment: e.comment,
    rating: e.rating,
    imageKey: e.imageKey,
    imageUrl: e.imageKey ? getPublicImageUrl(e.imageKey) : null,
  };
}

// ─── Read actions ─────────────────────────────────────────────────────────────

export async function fetchEntriesAction(
  cursor: EntryCursor | null,
  filters: FilterParams = DEFAULT_FILTERS,
) {
  const userId = await getUserId();
  const { entries, nextCursor } = await getEntries(userId, cursor, filters);
  return { entries: entries.map(toCardEntry), nextCursor };
}

export async function searchEntriesAction(
  query: string,
  filters: FilterParams = DEFAULT_FILTERS,
) {
  if (!query.trim()) return [];
  const userId = await getUserId();
  const results = await searchEntries(userId, query.trim(), filters);
  return results.map(toCardEntry);
}

export async function getCalendarYearsAction(
  filters: Pick<FilterParams, "categories" | "rating"> = { categories: [], rating: null },
) {
  const userId = await getUserId();
  return getCalendarYears(userId, filters);
}

export async function getCalendarMonthsAction(
  year: number,
  filters: Pick<FilterParams, "categories" | "rating"> = { categories: [], rating: null },
) {
  const userId = await getUserId();
  return getCalendarMonths(userId, year, filters);
}

export async function getCalendarDaysAction(
  year: number,
  month: number,
  filters: Pick<FilterParams, "categories" | "rating"> = { categories: [], rating: null },
) {
  const userId = await getUserId();
  return getCalendarDays(userId, year, month, filters);
}

// ─── Mutation actions ─────────────────────────────────────────────────────────

export async function generatePresignedUploadUrlAction(
  filename: string,
): Promise<{ key: string; url: string }> {
  return generatePresignedUploadUrl(filename);
}

export async function createEntryAction(input: {
  title: string;
  category: EntryCategory;
  date: string;
  comment: string | null;
  rating: number | null;
  imageKey: string | null;
}): Promise<{ id: string }> {
  const userId = await getUserId();
  return insertEntry(userId, input);
}

export async function updateEntryAction(input: {
  id: string;
  title: string;
  category: EntryCategory;
  date: string;
  comment: string | null;
  rating: number | null;
  imageKey: string | null;
  removeImage: boolean;
}): Promise<void> {
  const userId = await getUserId();
  const existing = await getEntryById(userId, input.id);
  if (!existing) throw new Error("Entry not found");

  let newImageKey = input.imageKey;

  if (input.removeImage && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
    newImageKey = null;
  } else if (input.imageKey && input.imageKey !== existing.imageKey && existing.imageKey) {
    await deleteS3Object(existing.imageKey);
  }

  await updateEntryById(userId, input.id, {
    title: input.title,
    category: input.category,
    date: input.date,
    comment: input.comment,
    rating: input.rating,
    imageKey: newImageKey,
  });
}

export async function deleteEntryAction(id: string): Promise<void> {
  const userId = await getUserId();
  const existing = await getEntryById(userId, id);
  if (!existing) throw new Error("Entry not found");

  if (existing.imageKey) {
    await deleteS3Object(existing.imageKey);
  }

  await deleteEntryById(userId, id);
}
