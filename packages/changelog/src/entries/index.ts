import type { ChangelogEntry } from "../types";
import { financerEntries } from "./financer";
import { sharedEntries } from "./shared";

/** Every entry, from every app's file. Which app an entry shows in is decided by its `apps`. */
export const allEntries: readonly ChangelogEntry[] = [...sharedEntries, ...financerEntries];
