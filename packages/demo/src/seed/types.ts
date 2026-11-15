import type { withTransaction } from "@jf/db";

/** The transaction handle `withTransaction` passes to its callback. */
export type Tx = Parameters<Parameters<typeof withTransaction>[0]>[0];
