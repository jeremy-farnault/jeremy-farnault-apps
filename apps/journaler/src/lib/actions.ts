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
