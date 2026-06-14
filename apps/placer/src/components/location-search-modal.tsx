"use client";

import { type NominatimAddress, formatAddress } from "@/lib/format-address";
import { ActionModal, TextInput, Tooltip } from "@jf/ui";
import { useEffect, useState } from "react";

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

export type SelectedLocation = {
  lat: number;
  lng: number;
  label: string;
};

interface LocationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: SelectedLocation) => void;
}

export function LocationSearchModal({ isOpen, onClose, onSelect }: LocationSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleSelect(result: NominatimResult) {
    onSelect({
      lat: Number.parseFloat(result.lat),
      lng: Number.parseFloat(result.lon),
      label: result.display_name,
    });
  }

  const showNoResults = !isLoading && query.trim().length > 0 && results.length === 0;

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      size="large"
      title="Find location"
      content={
        <div className="flex flex-col gap-3">
          <TextInput
            value={query}
            onChange={setQuery}
            placeholder="Search for an address…"
            autoFocus
          />
          {isLoading && <p className="text-xs text-(--grey-500)">Searching…</p>}
          {showNoResults && <p className="text-xs text-(--grey-500)">No results found.</p>}
          {results.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {results.map((r) => {
                const short = r.address ? formatAddress(r.address) : r.display_name;
                return (
                  <li key={r.place_id}>
                    <Tooltip content={r.display_name} side="top">
                      <button
                        type="button"
                        onClick={() => handleSelect(r)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-(--grey-700) hover:bg-(--surface-150) hover:text-(--grey-900)"
                      >
                        <span className="truncate">{short}</span>
                      </button>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      }
      secondaryButton={{ label: "Cancel", onClick: onClose }}
    />
  );
}
