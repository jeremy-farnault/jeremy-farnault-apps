import {
  CHANGELOG_APP_IDS,
  type ChangelogAppId,
  type ChangelogEntry,
  combinedChangelog,
} from "@jf/changelog";
import { ChangelogList, cn } from "@jf/ui";
import { getColorForeground } from "@jf/ui/color-palette";
import { apps } from "@jf/ui/config/apps";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Changelog · Indexer" };

const INDEXER = { id: "indexer", name: "Indexer" } as const;

// Every app with a changelog, alphabetical. Indexer isn't in the registry and has no accent.
const APPS = [
  ...apps.map((a) => ({ id: a.id, name: a.name, accent: a.accentColor })),
  { ...INDEXER, accent: undefined },
].sort((a, b) => a.name.localeCompare(b.name));

function isAppId(value: string | undefined): value is ChangelogAppId {
  return (CHANGELOG_APP_IDS as readonly string[]).includes(value ?? "");
}

function AppChip({ name, accent }: { name: string; accent: string | undefined }) {
  if (!accent) {
    return (
      <span className="rounded-full border border-(--border-strong) px-2.5 py-0.5 text-xs font-semibold text-(--text-secondary)">
        {name}
      </span>
    );
  }
  const background = `var(${accent})`;
  return (
    <span
      className="vivid rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background, color: getColorForeground(background) }}
    >
      {name}
    </span>
  );
}

function EntryApps({ entry }: { entry: ChangelogEntry }) {
  if (entry.apps === "all") return <AppChip name="All apps" accent={undefined} />;
  return (
    <>
      {APPS.filter((a) => entry.apps.includes(a.id as ChangelogAppId)).map((a) => (
        <AppChip key={a.id} name={a.name} accent={a.accent} />
      ))}
    </>
  );
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  // Plain links, not <Link>: a client-side navigation here could be caught by the
  // @modal/(.)[appId] interception meant for the app cards.
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-(--text) text-(--text-inverse)"
          : "bg-(--surface-150) text-(--text-secondary) hover:bg-(--surface-200) hover:text-(--text)"
      )}
    >
      {label}
    </a>
  );
}

// Every app's changelog in one list. ?app=<id> narrows it to one app (and the "all" entries).
export default async function CombinedChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>;
}) {
  const { app } = await searchParams;
  const appId = isAppId(app) ? app : undefined;
  const months = combinedChangelog(appId);

  return (
    <main className="flex w-full max-w-[640px] flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold text-(--text)">Changelog</h1>
      <nav aria-label="Filter by app" className="flex flex-wrap gap-2">
        <FilterChip href="/changelog" label="All apps" active={appId === undefined} />
        {APPS.map((a) => (
          <FilterChip
            key={a.id}
            href={`/changelog?app=${a.id}`}
            label={a.name}
            active={appId === a.id}
          />
        ))}
      </nav>
      <ChangelogList months={months} renderTags={(entry) => <EntryApps entry={entry} />} />
    </main>
  );
}
