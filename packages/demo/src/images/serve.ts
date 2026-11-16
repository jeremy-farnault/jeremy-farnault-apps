import type { BrowserContext } from "@playwright/test";

import { buildDemoFixtures } from "../fixtures";
import { todayInStockholm } from "../fixtures/dates";
import { type ArtSpec, renderArt } from "./art";

/**
 * The demo images are never uploaded: the rows carry storage keys, and during the capture the
 * browser's requests for those keys are answered with art drawn on the spot. So the seed needs
 * no AWS access at all. The flip side: signed in as the demo user in a normal browser, those
 * images are missing. That's fine for an account that exists for the screenshots.
 */

/** Every demo image key (`<app>/<user id>/demo/<name>.jpg`) and the art it shows. */
export function demoImages(userId: string): Map<string, ArtSpec> {
  // Keys don't depend on the date, so any day gives the same map.
  const fixtures = buildDemoFixtures({ userId, today: todayInStockholm() });
  return new Map([
    ...fixtures.exposer.photos.map((photo) => [photo.storageKey, photo.art] as const),
    ...fixtures.classer.images.map((image) => [image.key, image.art] as const),
    ...fixtures.journaler.images.map((image) => [image.key, image.art] as const),
  ]);
}

/**
 * The demo image key a request asks for, or null. Apps load images either straight from the
 * bucket (`https://<bucket>.s3.<region>.amazonaws.com/<key>`, e.g. Classer's covers) or through
 * Next's image proxy (`/_next/image?url=<that URL>&w=…`).
 */
export function demoImageKey(requestUrl: string): string | null {
  let url = new URL(requestUrl);
  if (url.pathname === "/_next/image") {
    const inner = url.searchParams.get("url");
    if (!inner) return null;
    url = new URL(inner, url.origin);
  }
  if (!url.hostname.endsWith(".amazonaws.com")) return null;
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  return /^[a-z]+\/[^/]+\/demo\/[a-z0-9-]+\.jpg$/.test(key) ? key : null;
}

/** Answers the context's requests for demo images with their rendered art. */
export async function serveDemoImages(context: BrowserContext, userId: string): Promise<void> {
  const images = demoImages(userId);
  const rendered = new Map<string, Promise<Buffer>>();
  await context.route(
    (url) => demoImageKey(url.href) !== null,
    async (route) => {
      const key = demoImageKey(route.request().url()) as string;
      const art = images.get(key);
      if (!art) return route.continue();
      if (!rendered.has(key)) rendered.set(key, renderArt(art));
      await route.fulfill({
        status: 200,
        contentType: "image/jpeg",
        body: await (rendered.get(key) as Promise<Buffer>),
      });
    }
  );
}
