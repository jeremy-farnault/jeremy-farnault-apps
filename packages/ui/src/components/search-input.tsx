"use client";

import { XIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import { TextInput } from "./text-input";

export interface SearchInputProps {
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  onDebouncedChange: (value: string) => void;
}

export function SearchInput({
  placeholder = "Search…",
  debounceMs = 300,
  className,
  onDebouncedChange,
}: SearchInputProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      onDebouncedChange(value);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs, onDebouncedChange]);

  return (
    <div className={cn("relative", className)}>
      <TextInput value={value} onChange={setValue} placeholder={placeholder} />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            onDebouncedChange("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-(--grey-400) hover:text-(--grey-700)"
          aria-label="Clear search"
        >
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}
