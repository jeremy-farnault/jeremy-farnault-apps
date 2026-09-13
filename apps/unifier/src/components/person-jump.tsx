"use client";

import { searchPeopleAction } from "@/lib/actions";
import type { PersonSearchRow } from "@/lib/queries";
import { ActionModal, SearchInput, cn } from "@jf/ui";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Jump straight to a person by name, from anywhere in the app. The daily loop is
 * almost always "open a specific person and update them", so this is the fast path
 * past the orbit and the arc list.
 */
export function PersonJump() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  // Guards against an earlier, slower search overwriting a later one's results.
  const latest = useRef(0);

  // ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = useCallback(async (value: string) => {
    const ticket = ++latest.current;
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      const found = await searchPeopleAction(trimmed);
      if (ticket !== latest.current) return;
      setResults(found);
      setActive(0);
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  }, []);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActive(0);
    setLoading(false);
  }

  function go(person: PersonSearchRow) {
    close();
    router.push(`/people/${person.id}`);
  }

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Find a person"
        className="flex h-11 w-11 items-center justify-center rounded-[10px] text-(--grey-700) transition-[background-color,transform] hover:bg-(--surface-200) active:scale-90"
      >
        <MagnifyingGlassIcon size={18} />
      </button>

      {open && (
        <ActionModal
          isOpen
          onClose={close}
          size="small"
          title="Find a person"
          mobilePosition="top"
          content={
            <div
              className="flex flex-col gap-2"
              onKeyDown={(e) => {
                if (results.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => (i + 1) % results.length);
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => (i - 1 + results.length) % results.length);
                }
                if (e.key === "Enter") {
                  e.preventDefault();
                  const person = results[active];
                  if (person) go(person);
                }
              }}
            >
              <SearchInput
                placeholder="Name…"
                debounceMs={150}
                onImmediateChange={(v) => {
                  setQuery(v);
                  if (v.trim()) setLoading(true);
                  else setLoading(false);
                }}
                onDebouncedChange={(v) => void runSearch(v)}
              />

              {!hasQuery ? (
                <p className="px-1 py-3 text-sm text-(--grey-500)">
                  Start typing a name to jump straight to someone.
                </p>
              ) : loading && results.length === 0 ? (
                <p className="px-1 py-3 text-sm text-(--grey-500)">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-3 text-sm text-(--grey-500)">
                  No one matches “{query.trim()}”.
                </p>
              ) : (
                <ul className="flex max-h-72 flex-col overflow-y-auto">
                  {results.map((person, i) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        onClick={() => go(person)}
                        onMouseEnter={() => setActive(i)}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-2.5 rounded-[10px] px-2 text-left transition-colors",
                          i === active ? "bg-(--surface-150)" : "hover:bg-(--surface-150)"
                        )}
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: person.arcColor ?? "var(--primary)" }}
                          aria-hidden
                        />
                        <span className="flex-1 truncate text-sm text-(--grey-900)">
                          {person.name}
                        </span>
                        <span className="shrink-0 text-xs text-(--grey-500)">{person.arcName}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          }
        />
      )}
    </>
  );
}
