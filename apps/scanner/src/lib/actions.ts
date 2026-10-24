"use server";

import { auth } from "@jf/auth";
import { scannerItems, scannerLinks, scannerPriceChecks, withTransaction } from "@jf/db";
import { headers } from "next/headers";

import {
  type Edition,
  type RejectionReason,
  normalizeUrl,
  parseLink,
  readPrice,
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
}): Promise<{ ok: true; preview: LinkPreview } | Rejection> {
  const userId = await getUserId();

  const url = parseLink(input.url);
  if (!url) return rejection("unreadable");

  const result = await readPrice(url.toString());
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

/**
 * Adds a new item from a previewed link. The page is read again here rather than trusting
 * the preview's numbers from the client, and that reading becomes the first price check.
 */
export async function addItemAction(input: {
  url: string;
  name: string;
  editionId: string | null;
}): Promise<{ ok: true; itemId: string } | Rejection> {
  const userId = await getUserId();
  const name = input.name.trim();
  if (!name) return { ok: false, reason: "unreadable", message: "Give the item a name." };

  const url = parseLink(input.url);
  if (!url) return rejection("unreadable");

  const result = await readPrice(url.toString(), { editionId: input.editionId });
  if (!result.ok) return rejection(result.reason, result.detail);
  const { reading } = result;
  const edition = reading.edition;
  if (!edition) {
    return { ok: false, reason: "unreadable", message: "Pick the edition you want to track." };
  }

  const normalizedUrl = normalizeUrl(url);
  // Only a page with several editions stores which one; a single-edition page may rename
  // its one offer without the link breaking.
  const editionId = reading.editions.length > 1 ? edition.id : null;

  try {
    const itemId = await withTransaction(async (tx) => {
      const [item] = await tx
        .insert(scannerItems)
        .values({ userId, name })
        .returning({ id: scannerItems.id });
      if (!item) throw new Error("Failed to create item");

      const [link] = await tx
        .insert(scannerLinks)
        .values({
          itemId: item.id,
          userId,
          url: url.toString(),
          normalizedUrl,
          store: reading.store,
          region: reading.region,
          editionId,
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
      return item.id;
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

/** Postgres unique_violation: the link-uniqueness constraint caught a duplicate. */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: string }).code === "23505") return true;
  }
  return false;
}
