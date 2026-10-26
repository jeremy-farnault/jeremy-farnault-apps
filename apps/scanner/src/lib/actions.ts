"use server";

import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import {
  SUPPORTED_CURRENCIES,
  db,
  scannerItems,
  scannerLinks,
  scannerPriceChecks,
  withTransaction,
} from "@jf/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import {
  type Edition,
  type RejectionReason,
  defaultSteamRegion,
  normalizeUrl,
  parseLink,
  readPrice,
  storeFor,
} from "./price-reader";
import { nameMatchKey } from "./price-reader/match-key";
import { findTrackedLinks, getWishlistMatchKeys } from "./queries";
import { copyImage, deleteImage, ownsKey, presignUpload } from "./s3";
import { suggestItem } from "./summary";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

// Rejections come back as results, not thrown errors: in production Next.js replaces a
// server action's error message with a generic one, and these messages are the point.

export type Rejection = {
  ok: false;
  reason: RejectionReason | "duplicate";
  message: string;
  /** The item that already tracks the link, for "duplicate". */
  item?: { id: string; name: string };
};

export type PreviewEdition = Omit<Edition, "saleEndsAt"> & { saleEndsAt: string | null };

export type LinkPreview = {
  url: string;
  name: string;
  imageUrl: string | null;
  store: string;
  region: string | null;
  /** Every edition on the page. More than one means the user picks. */
  editions: PreviewEdition[];
  /** Editions on this page the user already tracks, which the picker shows as taken. */
  trackedEditionIds: string[];
  /** A wishlist item this link looks like it belongs to, when asked for one. */
  suggestion: { itemId: string; itemName: string } | null;
};

function rejection(reason: RejectionReason, detail?: string): Rejection {
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

function toPreviewEdition(e: Edition): PreviewEdition {
  return { ...e, saleEndsAt: e.saleEndsAt?.toISOString() ?? null };
}

/**
 * Reads a pasted link for the add preview. Nothing is saved: the preview only shows what
 * Scanner found so the user can confirm it.
 */
export async function previewLinkAction(input: {
  url: string;
  /** The Steam storefront to price; defaults to the user's home-currency one. */
  region?: string | null;
  /** From the main page: look for a wishlist item this link may belong to. */
  suggest?: boolean;
}): Promise<{ ok: true; preview: LinkPreview } | Rejection> {
  const userId = await getUserId();

  const url = parseLink(input.url);
  if (!url) return rejection("unreadable");

  const region =
    storeFor(url) === "steam"
      ? (input.region ?? defaultSteamRegion((await getUserSettings(userId)).homeCurrency))
      : null;
  const result = await readPrice(url.toString(), { region });
  if (!result.ok) return rejection(result.reason, result.detail);
  const { reading } = result;

  // A single-edition page is stored without an edition id, so "" stands for it here.
  const tracked = await findTrackedLinks(userId, normalizeUrl(url), reading.region);
  const trackedEditionIds = tracked.map((t) => t.editionId ?? "");
  const pageIds = reading.editions.map((e) => (reading.editions.length > 1 ? e.id : ""));
  const first = tracked[0];
  if (first && pageIds.every((id) => trackedEditionIds.includes(id))) {
    return {
      ok: false,
      reason: "duplicate",
      message: `Already tracked in ${first.itemName}.`,
      item: { id: first.itemId, name: first.itemName },
    };
  }

  const suggestion = input.suggest
    ? suggestItem(
        {
          storeKey: reading.store === "ps-store" ? reading.matchKey : null,
          nameKey: nameMatchKey(reading.name),
        },
        await getWishlistMatchKeys(userId)
      )
    : null;

  return {
    ok: true,
    preview: {
      url: url.toString(),
      name: reading.name,
      imageUrl: reading.imageUrl,
      store: reading.store,
      region: reading.region,
      editions: reading.editions.map(toPreviewEdition),
      trackedEditionIds: trackedEditionIds.filter(Boolean),
      suggestion,
    },
  };
}

type AddInput = {
  url: string;
  editionId: string | null;
  /** The Steam storefront chosen in the preview; ignored for other stores. */
  region?: string | null;
};

/**
 * Adds a new item from a previewed link. The page is read again here rather than trusting
 * the preview's numbers from the client, and that reading becomes the first price check.
 */
/**
 * The image a new item starts with: the one the shop's page shows, one the user uploaded
 * (its S3 key), or none. "found" carries no URL: the server takes it from its own reading
 * of the page, so the browser can't make the server fetch anything else.
 */
export type ImageChoice = "found" | "none" | { key: string };

export async function addItemAction(
  input: AddInput & { name: string; image: ImageChoice }
): Promise<{ ok: true; itemId: string } | Rejection> {
  const userId = await getUserId();
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "unreadable", message: "Give the item a name." };
  return saveLink(userId, input, { name, image: input.image });
}

/** Presigns the browser's upload of an image the user picked. */
export async function presignImageUploadAction(): Promise<{ key: string; url: string }> {
  return presignUpload(await getUserId());
}

/** Replaces an item's image with an uploaded one, or removes it; the old object is deleted. */
export async function setItemImageAction(input: {
  itemId: string;
  key: string | null;
}): Promise<void> {
  const userId = await getUserId();
  if (input.key !== null && !ownsKey(userId, input.key)) throw new Error("Forbidden");

  const [item] = await db
    .select({ imageKey: scannerItems.imageKey })
    .from(scannerItems)
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)))
    .limit(1);
  if (!item) throw new Error("Item not found");

  await db
    .update(scannerItems)
    .set({ imageKey: input.key, updatedAt: new Date() })
    .where(eq(scannerItems.id, input.itemId));
  if (item.imageKey && item.imageKey !== input.key) await deleteImage(userId, item.imageKey);
}

/** Adds a previewed link to one of the user's wishlist items. */
export async function addLinkToItemAction(
  input: AddInput & { itemId: string }
): Promise<{ ok: true; itemId: string } | Rejection> {
  const userId = await getUserId();
  const [item] = await db
    .select({ id: scannerItems.id })
    .from(scannerItems)
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)))
    .limit(1);
  if (!item)
    return { ok: false, reason: "not-found", message: "That item doesn't exist any more." };
  return saveLink(userId, input, { itemId: item.id });
}

/** Reads the link once more and saves it, with its first price check, in one transaction. */
async function saveLink(
  userId: string,
  input: AddInput,
  target: { name: string; image: ImageChoice } | { itemId: string }
): Promise<{ ok: true; itemId: string } | Rejection> {
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
    return { ok: true, itemId };
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

export async function renameItemAction(input: { itemId: string; name: string }): Promise<void> {
  const userId = await getUserId();
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  await db
    .update(scannerItems)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)));
}

/** Deletes an item, its links, their price history and its image. */
export async function deleteItemAction(input: { itemId: string }): Promise<void> {
  const userId = await getUserId();
  const [deleted] = await db
    .delete(scannerItems)
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)))
    .returning({ imageKey: scannerItems.imageKey });
  if (deleted?.imageKey) await deleteImage(userId, deleted.imageKey);
}

/**
 * Removes a link and its price history. An item never keeps zero links: removing the last
 * one is refused here, and the page offers to delete the item instead.
 */
export async function removeLinkAction(input: { linkId: string }): Promise<{ ok: boolean }> {
  const userId = await getUserId();
  const [link] = await db
    .select({ id: scannerLinks.id, itemId: scannerLinks.itemId })
    .from(scannerLinks)
    .where(and(eq(scannerLinks.id, input.linkId), eq(scannerLinks.userId, userId)))
    .limit(1);
  if (!link) return { ok: false };

  const siblings = await db
    .select({ id: scannerLinks.id })
    .from(scannerLinks)
    .where(eq(scannerLinks.itemId, link.itemId));
  if (siblings.length <= 1) return { ok: false };

  await db.delete(scannerLinks).where(eq(scannerLinks.id, link.id));
  return { ok: true };
}

/** Postgres unique_violation: the link-uniqueness constraint caught a duplicate. */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}

/**
 * Marks an item bought, with what was paid, where and when. It leaves the wishlist and is
 * no longer checked; its links and price history stay, for "move back to wishlist".
 */
export async function markBoughtAction(input: {
  itemId: string;
  /** Minor units of `currency`. */
  price: number;
  currency: string;
  store: string;
  /** ISO date (yyyy-mm-dd); today when left out. */
  date?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const userId = await getUserId();
  if (!Number.isInteger(input.price) || input.price <= 0) {
    return { ok: false, message: "Enter the price you paid." };
  }
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(input.currency)) {
    return { ok: false, message: "Pick a currency." };
  }
  const store = input.store.trim().slice(0, 120);
  if (!store) return { ok: false, message: "Say where you bought it." };
  const boughtAt = input.date ? new Date(`${input.date}T12:00:00`) : new Date();
  if (Number.isNaN(boughtAt.getTime())) return { ok: false, message: "That date isn't valid." };

  const updated = await db
    .update(scannerItems)
    .set({
      status: "bought",
      boughtPrice: input.price,
      boughtCurrency: input.currency,
      boughtStore: store,
      boughtAt,
      updatedAt: new Date(),
    })
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)))
    .returning({ id: scannerItems.id });
  return updated[0] ? { ok: true } : { ok: false, message: "That item doesn't exist any more." };
}

/** Puts a bought item back on the wishlist and forgets what was paid. */
export async function moveToWishlistAction(input: { itemId: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .update(scannerItems)
    .set({
      status: "wishlist",
      boughtPrice: null,
      boughtCurrency: null,
      boughtStore: null,
      boughtAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)));
}
