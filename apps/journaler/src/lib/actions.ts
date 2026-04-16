"use server";

import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { getEntries, type EntryCursor } from "./queries";

export async function fetchEntriesAction(cursor: EntryCursor | null) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return getEntries(session.user.id, cursor);
}
