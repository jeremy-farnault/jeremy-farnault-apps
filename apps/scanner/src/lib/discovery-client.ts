import type { PreviewEdition } from "./preview-edition";

// What the discover route answers, in JSON (dates as ISO strings), and the client's call
// to it. Shared by both sides, so nothing here touches the server.

export type SuggestionReply = {
  url: string;
  name: string;
  imageUrl: string | null;
  editions: PreviewEdition[];
};

export type DiscoveryReply =
  | {
      status: "found";
      /** The certain match, added without asking, or why adding it was refused. */
      added:
        | { ok: true; name: string; edition: PreviewEdition }
        | { ok: false; message: string }
        | null;
      suggestions: SuggestionReply[];
    }
  | { status: "nothing-found" }
  | { status: "failed"; detail?: string };

/** Asks the server to look for an item in one store and region. Failed on any error. */
export async function requestDiscovery(
  itemId: string,
  body: { target: { store: string; region: string }; source: unknown; term: string }
): Promise<DiscoveryReply> {
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(itemId)}/discover`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { status: "failed", detail: `HTTP ${res.status}` };
    return (await res.json()) as DiscoveryReply;
  } catch {
    return { status: "failed" };
  }
}
