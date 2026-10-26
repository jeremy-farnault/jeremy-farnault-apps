import type { Edition } from "./price-reader";

/** An edition as it travels to the browser: JSON has no dates, so the sale end is a string. */
export type PreviewEdition = Omit<Edition, "saleEndsAt"> & { saleEndsAt: string | null };

export function toPreviewEdition(e: Edition): PreviewEdition {
  return { ...e, saleEndsAt: e.saleEndsAt?.toISOString() ?? null };
}
