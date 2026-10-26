import "server-only";

import { db, scannerItems, scannerLinks, scannerPriceChecks, withTransaction } from "@jf/db";
import { eq } from "drizzle-orm";

import {
  type Edition,
  type RejectionReason,
  normalizeUrl,
  parseLink,
  readPrice,
} from "./price-reader";
import { findTrackedLinks } from "./queries";
import { copyImage, deleteImage, ownsKey } from "./s3";

// The one path every link takes into the wishlist: pasted on the main page, added on an
// item's page, or found in another store. Callers check the session; this checks the link.
//
// Rejections come back as results, not thrown errors: in production Next.js replaces a
// server action's error message with a generic one, and these messages are the point.

export type Rejection = {
  ok: false;
  reason: RejectionReason | "duplicate";
  message: string;
  /** The item that already tracks the link, for "duplicate". */
  item?: { id: string; name: string };
};

export function rejection(reason: RejectionReason, detail?: string): Rejection {
  if (detail === "free") {
    return { ok: false, reason, message: "That game is free, so there's no price to track." };
  }
  if (detail === "en-jp") {
    return {
      ok: false,
      reason,
      message:
        "The English Japanese store shows US prices. Switch the store to Japanese (ja-jp) and paste that link.",
    };
  }
  const message = {
    unreadable: "Couldn't read a price from this page. Try another shop.",
    "unsupported-currency": `Scanner doesn't support prices in ${detail ?? "this currency"}.`,
    blocked: "This shop doesn't let Scanner read its pages. Try another shop.",
    "not-found":
      detail === "Edition no longer listed"
        ? "That edition isn't listed on the page any more."
        : "That page doesn't exist any more.",
  }[reason];
  return { ok: false, reason, message };
}

export type AddInput = {
  url: string;
  editionId: string | null;
  /** The Steam storefront chosen in the preview; ignored for other stores. */
  region?: string | null;
};

/**
 * The image a new item starts with: the one the shop's page shows, one the user uploaded
 * (its S3 key), or none. "found" carries no URL: the server takes it from its own reading
 * of the page, so the browser can't make the server fetch anything else.
 */
export type ImageChoice = "found" | "none" | { key: string };

/** A saved link: its item, and the product and edition it was read as. */
export type Saved = { ok: true; itemId: string; name: string; edition: Edition };

/** Reads the link once more and saves it, with its first price check, in one transaction. */
export async function saveLink(
  userId: string,
  input: AddInput,
  target: { name: string; image: ImageChoice } | { itemId: string }
): Promise<Saved | Rejection> {
  const url = parseLink(input.url);
  if (!url) return rejection("unreadable");

  const result = await readPrice(url.toString(), {
    editionId: input.editionId,
    region: input.region ?? null,
  });
  if (!result.ok) return rejection(result.reason, result.detail);
  const { reading } = result;
  const edition = reading.edition;
  if (!edition) {
    return { ok: false, reason: "unreadable", message: "Pick the edition you want to track." };
  }

  const normalizedUrl = normalizeUrl(url);
  // Only a page with several editions stores which one; a single-edition page may rename
  // its one offer without the link breaking.
  const several = reading.editions.length > 1;

  // Copied before the transaction, so a slow image server doesn't hold it open. A failed
  // copy just means no image.
  let imageKey: string | null = null;
  if ("name" in target) {
    if (target.image === "found" && reading.imageUrl) {
      imageKey = await copyImage(userId, reading.imageUrl);
    } else if (typeof target.image === "object" && ownsKey(userId, target.image.key)) {
      imageKey = target.image.key;
    }
  }

  try {
    const itemId = await withTransaction(async (tx) => {
      let itemId: string;
      if ("itemId" in target) {
        itemId = target.itemId;
        await tx
          .update(scannerItems)
          .set({ updatedAt: new Date() })
          .where(eq(scannerItems.id, itemId));
      } else {
        const [item] = await tx
          .insert(scannerItems)
          .values({ userId, name: target.name, imageKey })
          .returning({ id: scannerItems.id });
        if (!item) throw new Error("Failed to create item");
        itemId = item.id;
      }

      const [link] = await tx
        .insert(scannerLinks)
        .values({
          itemId,
          userId,
          url: url.toString(),
          normalizedUrl,
          store: reading.store,
          region: reading.region,
          editionId: several ? edition.id : null,
          editionName: several ? edition.name : null,
          matchKey: reading.matchKey,
          conceptId: reading.conceptId ?? null,
        })
        .returning({ id: scannerLinks.id });
      if (!link) throw new Error("Failed to create link");

      await tx.insert(scannerPriceChecks).values({
        linkId: link.id,
        normalPrice: edition.normalPrice,
        salePrice: edition.salePrice,
        currency: edition.currency,
        inStock: edition.inStock,
        discountPercent: edition.discountPercent,
        saleEndsAt: edition.saleEndsAt,
      });
      return itemId;
    });
    return { ok: true, itemId, name: reading.name, edition };
  } catch (err) {
    if (imageKey) await deleteImage(userId, imageKey);
    if (isUniqueViolation(err)) {
      const [tracked] = await findTrackedLinks(userId, normalizedUrl, reading.region);
      return {
        ok: false,
        reason: "duplicate",
        message: tracked ? `Already tracked in ${tracked.itemName}.` : "Already tracked.",
        ...(tracked ? { item: { id: tracked.itemId, name: tracked.itemName } } : {}),
      };
    }
    throw err;
  }
}

/** Postgres unique_violation: the link-uniqueness constraint caught a duplicate. */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}
