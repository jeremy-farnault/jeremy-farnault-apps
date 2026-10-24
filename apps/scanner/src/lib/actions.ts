"use server";

import { auth } from "@jf/auth";
import { getUserSettings } from "@jf/auth/settings";
import { db, scannerItems, scannerLinks, scannerPriceChecks, withTransaction } from "@jf/db";
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
import { findTrackedLinks } from "./queries";

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
export async function addItemAction(
  input: AddInput & { name: string }
): Promise<{ ok: true; itemId: string } | Rejection> {
  const userId = await getUserId();
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "unreadable", message: "Give the item a name." };
  return saveLink(userId, input, { name });
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
  target: { name: string } | { itemId: string }
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
          .values({ userId, name: target.name })
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

/** Deletes an item, its links and their price history. */
export async function deleteItemAction(input: { itemId: string }): Promise<void> {
  const userId = await getUserId();
  await db
    .delete(scannerItems)
    .where(and(eq(scannerItems.id, input.itemId), eq(scannerItems.userId, userId)));
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
