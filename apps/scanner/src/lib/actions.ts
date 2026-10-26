"use server";

import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { SUPPORTED_CURRENCIES, db, scannerItems, scannerLinks } from "@jf/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import type { DiscoverySource } from "./discovery";
import { type PreviewEdition, toPreviewEdition } from "./preview-edition";
import {
  type Edition,
  defaultSteamRegion,
  normalizeUrl,
  parseLink,
  readPrice,
  storeFor,
} from "./price-reader";
import { nameMatchKey } from "./price-reader/match-key";
import { findTrackedLinks, getPsLink, getWishlistMatchKeys } from "./queries";
import { deleteImage, ownsKey, presignUpload } from "./s3";
import {
  type AddInput,
  type ImageChoice,
  type Rejection,
  type Saved,
  rejection,
  saveLink,
} from "./save-link";
import { suggestItem } from "./summary";

export type { ImageChoice, Rejection } from "./save-link";

async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

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

/**
 * Adds a new item from a previewed link. The page is read again here rather than trusting
 * the preview's numbers from the client, and that reading becomes the first price check.
 */
export async function addItemAction(
  input: AddInput & { name: string; image: ImageChoice }
): Promise<Saved | Rejection> {
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
): Promise<Saved | Rejection> {
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

/**
 * What a search in other stores follows: the concept of the item's PS link, and the
 * platforms and kind of the edition it tracks. Read from the store again rather than saved,
 * so links that haven't learned their concept yet work too. Null when the item has no PS
 * link, or its page can't be read right now.
 */
export async function prepareDiscoveryAction(input: {
  itemId: string;
}): Promise<DiscoverySource | null> {
  const userId = await getUserId();
  const link = await getPsLink(userId, input.itemId);
  if (!link) return null;
  const result = await readPrice(link.url, { region: link.region, editionId: link.editionId });
  if (!result.ok) return null;
  const { reading } = result;
  const edition = reading.edition;
  if (!reading.conceptId || !edition) return null;
  return {
    conceptId: reading.conceptId,
    platforms: edition.platforms ?? [],
    kind: edition.kind ?? null,
  };
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
