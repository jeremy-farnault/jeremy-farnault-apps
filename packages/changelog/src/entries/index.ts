import type { ChangelogEntry } from "../types";
import { aiderEntries } from "./aider";
import { classerEntries } from "./classer";
import { doserEntries } from "./doser";
import { exposerEntries } from "./exposer";
import { financerEntries } from "./financer";
import { gainerEntries } from "./gainer";
import { journalerEntries } from "./journaler";
import { noterEntries } from "./noter";
import { organiserEntries } from "./organiser";
import { placerEntries } from "./placer";
import { routinerEntries } from "./routiner";
import { scannerEntries } from "./scanner";
import { sharedEntries } from "./shared";
import { tracerEntries } from "./tracer";
import { unifierEntries } from "./unifier";

/** Every entry, from every app's file. Which app an entry shows in is decided by its `apps`. */
export const allEntries: readonly ChangelogEntry[] = [
  ...sharedEntries,
  ...aiderEntries,
  ...classerEntries,
  ...doserEntries,
  ...exposerEntries,
  ...financerEntries,
  ...gainerEntries,
  ...journalerEntries,
  ...noterEntries,
  ...organiserEntries,
  ...placerEntries,
  ...routinerEntries,
  ...scannerEntries,
  ...tracerEntries,
  ...unifierEntries,
];
