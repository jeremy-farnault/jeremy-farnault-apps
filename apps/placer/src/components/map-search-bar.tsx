"use client";

import type { CategoryRow, SpotRow } from "@/lib/queries";
import { Select, SelectItem, TextInput } from "@jf/ui";
import { useEffect, useState } from "react";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

type SearchResult =
  | { kind: "spot"; spot: SpotRow }
  | { kind: "address"; display_name: string; lat: number; lng: number }
  | { kind: "coordinates"; lat: number; lng: number };

interface MapSearchBarProps {
  spots: SpotRow[];
  categories: CategoryRow[];
  activeCategoryId: string | null;
  onFlyTo: (target: { lat: number; lng: number; zoom: number }) => void;
  onCategoryChange: (id: string | null) => void;
}

function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const match = /^([-+]?\d+(?:\.\d*)?)\s*,\s*([-+]?\d+(?:\.\d*)?)$/.exec(input.trim());
  if (!match) return null;
  const lat = Number.parseFloat(match[1]!);
  const lng = Number.parseFloat(match[2]!);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export function MapSearchBar({
  spots,
  categories,
  activeCategoryId,
  onFlyTo,
  onCategoryChange,
}: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const coordMatch = parseCoordinates(query);
  const trimmed = query.trim();

  const spotResults =
    !coordMatch && trimmed.length >= 1
      ? spots.filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase())).slice(0, 5)
      : [];

  useEffect(() => {
    if (coordMatch || trimmed.length < 2) {
      setNominatimResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=5`
        );
        const data: NominatimResult[] = await res.json();
        setNominatimResults(data);
      } catch {
        setNominatimResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed, coordMatch]);

  const results: SearchResult[] = [
    ...(coordMatch ? [{ kind: "coordinates" as const, ...coordMatch }] : []),
    ...spotResults.map((spot) => ({ kind: "spot" as const, spot })),
    ...(!coordMatch
      ? nominatimResults.map((r) => ({
          kind: "address" as const,
          display_name: r.display_name,
          lat: Number.parseFloat(r.lat),
          lng: Number.parseFloat(r.lon),
        }))
      : []),
  ];

  const showDropdown = showResults && (results.length > 0 || isLoading);

  function handleSelect(result: SearchResult) {
    if (result.kind === "spot") {
      onFlyTo({ lat: result.spot.lat, lng: result.spot.lng, zoom: 15 });
    } else if (result.kind === "address") {
      onFlyTo({ lat: result.lat, lng: result.lng, zoom: 14 });
    } else {
      onFlyTo({ lat: result.lat, lng: result.lng, zoom: 14 });
    }
    setQuery("");
    setShowResults(false);
  }

  function handleContainerBlur() {
    setTimeout(() => setShowResults(false), 150);
  }

  return (
    <div className="absolute top-7 right-7 z-[3000] flex w-[min(520px,calc(100%-3.5rem))] gap-2 rounded-xl bg-(--card) p-2 shadow-[0_0_10px_rgba(0,0,0,0.1)]">
      <div
        className="relative flex-1"
        onFocus={() => setShowResults(true)}
        onBlur={handleContainerBlur}
      >
        <TextInput
          value={query}
          onChange={(v) => {
            setQuery(v);
            setShowResults(true);
          }}
          placeholder="Search spots, addresses, coordinates…"
        />

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl border border-(--border) bg-(--card) shadow-[0_25px_36px_0_rgba(0,0,0,0.25)]">
            {isLoading && !coordMatch && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-(--grey-500)">Searching…</p>
            )}

            {coordMatch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect({ kind: "coordinates", ...coordMatch })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--grey-700) hover:bg-(--surface-150) hover:text-(--grey-900)"
              >
                <span className="text-(--grey-400)">Go to</span>
                <span className="font-mono">
                  {coordMatch.lat.toFixed(5)}, {coordMatch.lng.toFixed(5)}
                </span>
              </button>
            )}

            {spotResults.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-xs text-(--grey-400)">Saved spots</p>
                {spotResults.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect({ kind: "spot", spot })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--grey-700) hover:bg-(--surface-150) hover:text-(--grey-900)"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: spot.category?.color ?? "var(--grey-400)" }}
                    />
                    {spot.name}
                  </button>
                ))}
              </>
            )}

            {nominatimResults.length > 0 && !coordMatch && (
              <>
                {spotResults.length > 0 && <div className="mx-3 h-px bg-(--border)" />}
                <p className="px-3 pb-1 pt-2 text-xs text-(--grey-400)">Places</p>
                {nominatimResults.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() =>
                      handleSelect({
                        kind: "address",
                        display_name: r.display_name,
                        lat: Number.parseFloat(r.lat),
                        lng: Number.parseFloat(r.lon),
                      })
                    }
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--grey-700) hover:bg-(--surface-150) hover:text-(--grey-900)"
                  >
                    <span className="truncate">{r.display_name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="w-36 shrink-0">
        <Select
          value={activeCategoryId ?? "all"}
          onValueChange={(v) => onCategoryChange(v === "all" ? null : v)}
          placeholder="All"
        >
          <SelectItem value="all">All</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </Select>
      </div>
    </div>
  );
}
