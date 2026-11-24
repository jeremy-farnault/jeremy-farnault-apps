import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { AppBackground } from "./app-background";

const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:3014";

// The shapes `@jf/changelog` returns, restated here so `@jf/ui` doesn't depend on it
// (`@jf/changelog` checks its app ids against `@jf/ui`'s registry, so the other way round
// would be a cycle). TypeScript matches them structurally.
type ChangelogKind = "new" | "improved" | "fixed";

interface ChangelogListEntry {
  id: string;
  date: string;
  kind: ChangelogKind;
  title: string;
  description: string;
}

export interface ChangelogListMonth {
  month: string;
  entries: readonly ChangelogListEntry[];
}

const KIND_LABEL: Record<ChangelogKind, string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

const KIND_CLASS: Record<ChangelogKind, string> = {
  new: "vivid bg-(--primary) text-(--primary-foreground)",
  improved: "bg-(--surface-175) text-(--text)",
  fixed: "border border-(--border-strong) text-(--text-secondary)",
};

// Fixed locale and UTC, so the server and the browser print the same thing.
const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatMonth(month: string): string {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

function formatDay(date: string): string {
  return dayFormat.format(new Date(`${date}T00:00:00Z`));
}

/** An app's changelog: months newest first, each with its entries. */
export function ChangelogList({ months }: { months: readonly ChangelogListMonth[] }) {
  if (months.length === 0) {
    return <p className="text-sm text-(--text-muted)">Nothing here yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {months.map(({ month, entries }) => (
        <section key={month} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-(--text-muted)">
            {formatMonth(month)}
          </h2>
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-1.5 rounded-[18px] bg-(--surface-150) px-5 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      KIND_CLASS[entry.kind]
                    )}
                  >
                    {KIND_LABEL[entry.kind]}
                  </span>
                  <time dateTime={entry.date} className="text-xs text-(--text-subtle)">
                    {formatDay(entry.date)}
                  </time>
                </div>
                <h3 className="text-base font-semibold text-(--text)">{entry.title}</h3>
                <p className="text-sm text-(--text-secondary)">{entry.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface PublicChangelogPageProps {
  appName: string;
  appIcon: ReactNode;
  months: readonly ChangelogListMonth[];
  // URL of the app's background scene, usually "/background.svg" in its public folder.
  background?: string;
}

/**
 * The changelog for someone who isn't logged in: the app's name in its accent colour, the
 * entries and a link to the Indexer portfolio. No app shell, so nothing here reads the session.
 */
export function PublicChangelogPage({
  appName,
  appIcon,
  months,
  background,
}: PublicChangelogPageProps) {
  return (
    <div className="relative flex flex-col items-center w-full max-w-[1024px] min-h-screen">
      {background && <AppBackground src={background} />}
      <header className="flex h-14 items-center w-full px-4 pt-3">
        <div className="flex items-center gap-2 text-l font-semibold text-(--primary-foreground) vivid bg-(--primary) px-4 py-1 rounded-xl">
          {appIcon}
          {appName}
        </div>
      </header>
      <ChangelogContent months={months} />
      <footer className="w-full max-w-[640px] px-4 pb-12">
        <a
          href={INDEXER_URL}
          className="text-sm font-semibold text-(--text) underline underline-offset-4 hover:opacity-80"
        >
          See all the apps on Indexer
        </a>
      </footer>
    </div>
  );
}

/** The changelog's heading and list, for a page inside the app shell. */
export function ChangelogContent({ months }: { months: readonly ChangelogListMonth[] }) {
  return (
    <main className="flex flex-col gap-6 w-full max-w-[640px] px-4 py-8">
      <h1 className="text-2xl font-semibold text-(--text)">Changelog</h1>
      <ChangelogList months={months} />
    </main>
  );
}
