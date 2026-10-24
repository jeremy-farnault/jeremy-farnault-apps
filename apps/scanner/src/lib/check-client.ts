import type { CheckedLink } from "./check-link";

/**
 * Asks the server to check one link and revives the dates JSON flattened. Null when the
 * link is gone, belongs to a bought item, or the request failed.
 */
export async function requestCheck(linkId: string): Promise<CheckedLink | null> {
  const res = await fetch(`/api/links/${encodeURIComponent(linkId)}/check`, { method: "POST" });
  if (!res.ok) return null;
  const body = (await res.json()) as CheckedLink;
  const latest = body.latest;
  return {
    ...body,
    lastCheckedAt: new Date(body.lastCheckedAt),
    lastSuccessAt: new Date(body.lastSuccessAt),
    latest: latest && {
      ...latest,
      checkedAt: new Date(latest.checkedAt),
      saleEndsAt: latest.saleEndsAt ? new Date(latest.saleEndsAt) : null,
    },
  };
}
