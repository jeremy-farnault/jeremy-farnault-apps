// Shop discovery ticket 01's reachability check: can a server use Steam's store search, the
// PS Store's GraphQL search and PS concept pages? Removed with the debug page once tickets
// 04 and 05 add search to the live check script.

// A desktop browser's user agent: the stores serve their full responses to browsers.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// The search query the store's own front end sends. Only allowlisted hashes are accepted,
// and this one changes when Sony redeploys the store.
const PS_SEARCH_HASH = "4df6284f982e57bec70f23c77e2c219dc792eb19af7fb3d3a81767aa3f1958aa";

const PS_LOCALES = [
  { locale: "sv-se", country: "SE", language: "sv" },
  { locale: "en-nz", country: "NZ", language: "en" },
  { locale: "ja-jp", country: "JP", language: "ja" },
] as const;

const MORTAL_SHELL_CONCEPT = "234489";

export type ProbeTarget = {
  kind: "steam-search" | "ps-search" | "ps-concept";
  label: string;
  url: string;
  headers?: Record<string, string>;
};

export function steamSearchUrl(term: string, cc: string): string {
  const params = new URLSearchParams({ term, cc, l: "english" });
  return `https://store.steampowered.com/api/storesearch/?${params}`;
}

export function psSearchUrl(term: string, country: string, language: string): string {
  const params = new URLSearchParams({
    operationName: "getSearchResults",
    variables: JSON.stringify({
      countryCode: country,
      languageCode: language,
      nextCursor: "",
      pageOffset: 0,
      pageSize: 24,
      searchTerm: term,
    }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: PS_SEARCH_HASH } }),
  });
  return `https://web.np.playstation.com/api/graphql/v1/op?${params}`;
}

export const PROBE_TARGETS: ProbeTarget[] = [
  ...["se", "nz", "jp"].map((cc) => ({
    kind: "steam-search" as const,
    label: `Steam search "Mortal Shell" (${cc})`,
    url: steamSearchUrl("Mortal Shell", cc),
  })),
  ...["Horizon Forbidden West", "Mortal Shell"].flatMap((term) =>
    PS_LOCALES.map((l) => ({
      kind: "ps-search" as const,
      label: `PS search "${term}" (${l.locale})`,
      url: psSearchUrl(term, l.country, l.language),
      headers: {
        // Without it the API refuses the request as a possible CSRF.
        "content-type": "application/json",
        "x-psn-store-locale-override": `${l.language}-${l.country}`,
      },
    }))
  ),
  ...PS_LOCALES.map((l) => ({
    kind: "ps-concept" as const,
    label: `PS concept Mortal Shell (${l.locale})`,
    url: `https://store.playstation.com/${l.locale}/concept/${MORTAL_SHELL_CONCEPT}`,
  })),
];

export type ProbeResult = {
  label: string;
  status: number | null;
  finalUrl: string | null;
  ms: number;
  /** How many results came back, or null when the response had none to count. */
  count: number | null;
  first: string | null;
  error: string | null;
};

/** Counts the results in a response and names the first, per kind of request. */
export function summarize(
  kind: ProbeTarget["kind"],
  body: string
): Pick<ProbeResult, "count" | "first" | "error"> {
  try {
    if (kind === "steam-search") {
      const items = (JSON.parse(body).items ?? []) as { id: number; name: string }[];
      return {
        count: items.length,
        first: items[0] ? `${items[0].name} (${items[0].id})` : null,
        error: null,
      };
    }
    if (kind === "ps-search") {
      const json = JSON.parse(body);
      if (json.errors || !json.data) {
        return {
          count: null,
          first: null,
          error: JSON.stringify(json.errors ?? json).slice(0, 200),
        };
      }
      const results = (json.data.universalSearch?.results ?? []) as { id: string; name: string }[];
      return {
        count: results.length,
        first: results[0] ? `${results[0].name} (${results[0].id})` : null,
        error: null,
      };
    }
    const found = body.includes(`Concept:${MORTAL_SHELL_CONCEPT}`);
    return {
      count: found ? 1 : 0,
      first: found ? `Concept:${MORTAL_SHELL_CONCEPT} embedded` : null,
      error: null,
    };
  } catch (err) {
    return { count: null, first: null, error: `Unparseable: ${body.slice(0, 120)}` };
  }
}

export async function probe(
  target: ProbeTarget,
  fetchFn: typeof fetch = fetch
): Promise<ProbeResult> {
  const started = Date.now();
  try {
    const res = await fetchFn(target.url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en", ...target.headers },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    return {
      label: target.label,
      status: res.status,
      finalUrl: res.url,
      ms: Date.now() - started,
      ...summarize(target.kind, body),
    };
  } catch (err) {
    return {
      label: target.label,
      status: null,
      finalUrl: null,
      ms: Date.now() - started,
      count: null,
      first: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
