import type { Poi } from "@/config/game";

type Ranked = { poi: Poi; rank: 0 | 1 | 2 };

export function searchPois(pois: Poi[], query: string, limit = 10): Poi[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const ranked: Ranked[] = [];
  for (const poi of pois) {
    const label = poi.label.toLowerCase();
    if (label === q) ranked.push({ poi, rank: 0 });
    else if (label.startsWith(q)) ranked.push({ poi, rank: 1 });
    else if (label.includes(q)) ranked.push({ poi, rank: 2 });
  }

  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.poi.label.localeCompare(b.poi.label);
  });

  return ranked.slice(0, limit).map((r) => r.poi);
}
