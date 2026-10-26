"use client";

import { addLinkToItemAction, prepareDiscoveryAction } from "@/lib/actions";
import {
  type DiscoveryReply,
  type SuggestionReply,
  requestDiscovery,
} from "@/lib/discovery-client";
import { formatPrice, storeLabel } from "@/lib/format";
import type { StoreRegion } from "@/lib/summary";
import { Button, Checkbox, TextInput, cn } from "@jf/ui";
import {
  CheckCircleIcon,
  CircleNotchIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ItemImage } from "./item-image";

type Props = {
  item: { id: string; name: string };
  /** Where the user shops, minus where the item already is: offered ticked. */
  offered: StoreRegion[];
  /** Stores and regions Scanner could look in that aren't offered, for "+ another". */
  others: (StoreRegion & { label: string })[];
  online: boolean;
  onClose: () => void;
  /** Links were added: the page reloads its data. */
  onAdded: () => void;
};

const keyOf = (t: StoreRegion) => `${t.store}:${t.region}`;
const labelOf = (t: StoreRegion) => `${storeLabel(t.store, "")} · ${t.region}`;

/** One target's search. It keeps its target: an auto-add takes it off the offered list. */
type Row = { target: StoreRegion; result: DiscoveryReply | "searching" };
/** A ticked suggestion: the edition picked, when its page sells several, and how adding went. */
type Pick = { editionId: string | null; needsEdition: boolean; error?: string; added?: boolean };

/**
 * Looks for an item in the user's other stores and regions. A certain match (the same PS
 * game, same edition, in another region) is added as soon as it's found; anything else
 * comes back as a suggestion to tick. Results aren't kept: closing the panel forgets them.
 */
export function DiscoveryPanel({ item, offered, others, online, onClose, onAdded }: Props) {
  const [term, setTerm] = useState(item.name);
  const [extra, setExtra] = useState<StoreRegion[]>([]);
  // An added store drops out once the item has a link there, as `others` no longer lists it.
  const targets = [...offered, ...extra.filter((e) => others.some((o) => keyOf(o) === keyOf(e)))];
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(offered.map(keyOf)));
  const [rows, setRows] = useState<Map<string, Row>>(new Map());
  const [picks, setPicks] = useState<Map<string, Pick>>(new Map());
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  // A store added from "+ another" starts ticked.
  useEffect(() => {
    setTicked((prev) => new Set([...prev, ...extra.map(keyOf)]));
  }, [extra]);

  async function search() {
    const chosen = targets.filter((t) => ticked.has(keyOf(t)));
    if (chosen.length === 0 || searching) return;
    setSearching(true);
    setPicks(new Map());
    setRows(new Map(chosen.map((t) => [keyOf(t), { target: t, result: "searching" as const }])));
    try {
      const source = await prepareDiscoveryAction({ itemId: item.id });
      const replies = await Promise.all(
        chosen.map(async (target) => {
          const result = await requestDiscovery(item.id, { target, source });
          setRows((prev) => new Map(prev).set(keyOf(target), { target, result }));
          return result;
        })
      );
      if (replies.some((r) => r.status === "found" && r.added?.ok)) onAdded();
    } catch {
      toast.error("Something went wrong. Try again.");
      setRows(new Map());
    } finally {
      setSearching(false);
    }
  }

  async function addPicked() {
    if (adding) return;
    setAdding(true);
    let any = false;
    try {
      for (const [url, pick] of picks) {
        if (pick.added) continue;
        const result = await addLinkToItemAction({
          url,
          editionId: pick.editionId,
          itemId: item.id,
        });
        setPicks((prev) =>
          new Map(prev).set(
            url,
            result.ok ? { ...pick, added: true } : { ...pick, error: result.message }
          )
        );
        if (result.ok) any = true;
      }
      if (any) onAdded();
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setAdding(false);
    }
  }

  const pending = [...picks.values()].filter((p) => !p.added);
  const ready = pending.length > 0 && pending.every((p) => !p.needsEdition || p.editionId);

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-(--surface-100) p-4 card-raised surface-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-(--text)">Find in other stores</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-8 w-8 items-center justify-center rounded-full text-(--text-secondary) transition-colors hover:bg-(--surface-200)"
        >
          <XIcon size={16} />
        </button>
      </div>

      <TextInput value={term} onChange={setTerm} placeholder="Search for" />

      {targets.length === 0 ? (
        <p className="text-sm text-(--text-muted)">
          No other store Scanner can look in for this item yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {targets.map((t) => (
            <Checkbox
              key={keyOf(t)}
              checked={ticked.has(keyOf(t))}
              disabled={searching}
              onChange={(on) =>
                setTicked((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(keyOf(t));
                  else next.delete(keyOf(t));
                  return next;
                })
              }
              label={<span className="text-sm text-(--text)">{labelOf(t)}</span>}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {others.length > 0 && (
          <select
            value=""
            disabled={searching}
            onChange={(e) => {
              const other = others.find((o) => keyOf(o) === e.target.value);
              if (other)
                setExtra((prev) => [...prev, { store: other.store, region: other.region }]);
            }}
            className="cursor-pointer rounded-[10px] bg-(--surface-sunken) px-2 py-1.5 text-sm text-(--text-secondary) outline-none"
          >
            <option value="">+ another store or region</option>
            {others
              .filter((o) => !targets.some((t) => keyOf(t) === keyOf(o)))
              .map((o) => (
                <option key={keyOf(o)} value={keyOf(o)}>
                  {o.label}
                </option>
              ))}
          </select>
        )}
        <Button
          onClick={() => void search()}
          disabled={!online || searching || !targets.some((t) => ticked.has(keyOf(t)))}
          className="ml-auto gap-2"
        >
          <MagnifyingGlassIcon size={16} /> {searching ? "Searching…" : "Search"}
        </Button>
      </div>

      {rows.size > 0 && (
        <ul className="flex flex-col gap-3">
          {[...rows].map(([key, row]) => (
            <li key={key} className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
                {labelOf(row.target)}
              </p>
              <TargetResult
                result={row.result}
                picks={picks}
                onPick={(url, pick) =>
                  setPicks((prev) => {
                    const next = new Map(prev);
                    if (pick) next.set(url, pick);
                    else next.delete(url);
                    return next;
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <Button onClick={() => void addPicked()} disabled={!ready || adding} className="self-end">
          {adding ? "Adding…" : `Add selected (${pending.length})`}
        </Button>
      )}
    </section>
  );
}

function TargetResult({
  result,
  picks,
  onPick,
}: {
  result: Row["result"];
  picks: Map<string, Pick>;
  onPick: (url: string, pick: Pick | null) => void;
}) {
  if (result === "searching") {
    return (
      <p className="flex items-center gap-1.5 text-sm text-(--text-muted)">
        <CircleNotchIcon size={14} className="animate-spin" aria-hidden /> Looking…
      </p>
    );
  }
  if (result.status === "nothing-found") {
    return <p className="text-sm text-(--text-muted)">Nothing found.</p>;
  }
  if (result.status === "failed") {
    return <p className="text-sm text-(--text-muted)">Couldn't look here right now.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {result.added &&
        (result.added.ok ? (
          <p className="flex items-center gap-1.5 text-sm text-(--text)">
            <CheckCircleIcon size={16} weight="fill" className="text-(--primary)" aria-hidden />
            Added {result.added.edition.name} ·{" "}
            {formatPrice(
              result.added.edition.salePrice ?? result.added.edition.normalPrice,
              result.added.edition.currency
            )}
          </p>
        ) : (
          <p className="text-sm text-(--text-muted)">{result.added.message}</p>
        ))}
      {result.suggestions.map((s) => (
        <Suggestion
          key={s.url}
          suggestion={s}
          pick={picks.get(s.url)}
          onPick={(pick) => onPick(s.url, pick)}
        />
      ))}
    </div>
  );
}

function Suggestion({
  suggestion,
  pick,
  onPick,
}: {
  suggestion: SuggestionReply;
  pick: Pick | undefined;
  onPick: (pick: Pick | null) => void;
}) {
  const several = suggestion.editions.length > 1;
  const only = several ? undefined : suggestion.editions[0];

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-(--surface-sunken) p-2",
        pick?.added && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={pick !== undefined}
          disabled={pick?.added === true}
          onChange={(on) => onPick(on ? { editionId: null, needsEdition: several } : null)}
        />
        <ItemImage url={suggestion.imageUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-(--text)">{suggestion.name}</p>
          {only && <p className="truncate text-xs text-(--text-muted)">{only.name}</p>}
        </div>
        {only && (
          <span className="shrink-0 text-sm font-semibold text-(--text)">
            {formatPrice(only.salePrice ?? only.normalPrice, only.currency)}
          </span>
        )}
      </div>
      {several && pick && !pick.added && (
        <fieldset className="flex flex-col gap-1 pl-8">
          <legend className="mb-1 text-xs text-(--text-muted)">Which one?</legend>
          {suggestion.editions.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 text-sm text-(--text)"
            >
              <input
                type="radio"
                name={`edition-${suggestion.url}`}
                checked={pick.editionId === e.id}
                onChange={() => onPick({ ...pick, editionId: e.id })}
              />
              <span className="flex-1">{e.name}</span>
              <span className="font-medium">
                {formatPrice(e.salePrice ?? e.normalPrice, e.currency)}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {pick?.added && <p className="pl-8 text-xs text-(--text-muted)">Added</p>}
      {pick?.error && (
        <p role="alert" className="pl-8 text-xs text-(--red-500)">
          {pick.error}
        </p>
      )}
    </div>
  );
}
