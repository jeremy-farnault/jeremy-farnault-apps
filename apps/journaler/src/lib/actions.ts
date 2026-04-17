"use server";

import { auth } from "@jf/auth";
import { headers } from "next/headers";
import {
  DEFAULT_FILTERS,
  getEntries,
  searchEntries,
  type EntryCursor,
  type FilterParams,
} from "./queries";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function fetchEntriesAction(
  cursor: EntryCursor | null,
  filters: FilterParams = DEFAULT_FILTERS,
) {
  const userId = await getUserId();
  return getEntries(userId, cursor, filters);
}

export async function searchEntriesAction(
  query: string,
  filters: FilterParams = DEFAULT_FILTERS,
) {
  if (!query.trim()) return [];
  const userId = await getUserId();
  return searchEntries(userId, query.trim(), filters);
}
