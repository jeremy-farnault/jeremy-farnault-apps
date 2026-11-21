// One-off: move Financer's closed-month summaries back into entries (Combine Entries,
// ticket 01). Deleted with the summaries tables (ticket 04).
//
//   pnpm migrate:summaries dry-run   report only, writes nothing (default)
//   pnpm migrate:summaries apply     one transaction per table, checked before commit
//   pnpm migrate:summaries verify    read-only checks, any time after apply
//
// Needs DATABASE_URL in the environment (it never reads .env, on purpose). Works with
// Neon's direct connection and with a plain local Postgres.
//
// Safety: apply only inserts. Each entry reuses its summary's id, so a second run
// changes nothing, and deleting the entries whose id is a summary id undoes it exactly.
// Values, months, currencies and dates are copied in SQL; JavaScript only decides
// which source an income or asset entry belongs to.

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import pg from "pg";
import {
  type SourcePlan,
  type SpendingPlan,
  planSourceSummaries,
  planSpendingSummaries,
} from "./plan";

type Mode = "dry-run" | "apply" | "verify";

type SourceTable = {
  label: string;
  summaries: string;
  entries: string;
  sources: string;
};

const SPENDING = {
  label: "Spending",
  summaries: "financer_summaries",
  entries: "financer_entries",
  categories: "financer_spending_categories",
} as const;

const SOURCE_TABLES: SourceTable[] = [
  {
    label: "Income",
    summaries: "financer_income_summaries",
    entries: "financer_income_entries",
    sources: "financer_income_sources",
  },
  {
    label: "Assets",
    summaries: "financer_asset_summaries",
    entries: "financer_asset_entries",
    sources: "financer_asset_sources",
  },
];

// Rows as (id, user_id, month, currency, value). Entries of income and assets take
// their currency from their source.
const SPENDING_ENTRY_ROWS = `select id, user_id, month, currency, value from ${SPENDING.entries}`;
const SPENDING_SUMMARY_ROWS = `select id, user_id, month, currency, value from ${SPENDING.summaries}`;
const sourceEntryRows = (t: SourceTable) =>
  `select e.id, e.user_id, e.month, src.currency, e.value from ${t.entries} e join ${t.sources} src on src.id = e.source_id`;
const sourceSummaryRows = (t: SourceTable) =>
  `select id, user_id, month, currency, value from ${t.summaries}`;

type Db = pg.Client | pg.PoolClient;

// ─── Reading ─────────────────────────────────────────────────────────────────

async function pendingSpendingPlan(db: Db): Promise<{ plan: SpendingPlan; total: number }> {
  // One query at a time: a pg client runs them in sequence anyway.
  const summaries = await db.query<{ id: string; userId: string; category: string }>(
    `select s.id, s.user_id as "userId", s.category from ${SPENDING.summaries} s
     where not exists (select 1 from ${SPENDING.entries} e where e.id = s.id)
     order by s.user_id, s.month, s.category`
  );
  const categories = await db.query<{ userId: string; name: string }>(
    `select user_id as "userId", name from ${SPENDING.categories}`
  );
  const total = await countRows(db, SPENDING.summaries);
  return { plan: planSpendingSummaries(summaries.rows, categories.rows), total };
}

async function pendingSourcePlan(
  db: Db,
  t: SourceTable
): Promise<{ plan: SourcePlan; total: number; userBySummary: Map<string, string> }> {
  const summaries = await db.query<{ id: string; userId: string; name: string; currency: string }>(
    `select s.id, s.user_id as "userId", s.name, s.currency from ${t.summaries} s
     where not exists (select 1 from ${t.entries} e where e.id = s.id)
     order by s.user_id, s.month, s.name`
  );
  const sources = await db.query<{ id: string; userId: string; name: string; currency: string }>(
    `select id, user_id as "userId", name, currency from ${t.sources}`
  );
  const total = await countRows(db, t.summaries);
  const plan = planSourceSummaries(summaries.rows, sources.rows, randomUUID);
  const userBySummary = new Map(summaries.rows.map((s) => [s.id, s.userId]));
  return { plan, total, userBySummary };
}

async function countRows(db: Db, table: string): Promise<number> {
  const { rows } = await db.query<{ n: string }>(`select count(*) as n from ${table}`);
  return Number(rows[0]?.n ?? 0);
}

async function countByUser(db: Db, table: string): Promise<Map<string, number>> {
  const { rows } = await db.query<{ userId: string; n: string }>(
    `select user_id as "userId", count(*) as n from ${table} group by user_id`
  );
  return new Map(rows.map((r) => [r.userId, Number(r.n)]));
}

// ─── Checks ──────────────────────────────────────────────────────────────────

type RowStatus = {
  id: string;
  userId: string;
  month: string;
  label: string;
  currency: string;
  summaryValue: string;
  entryValue: string | null;
  status: "intact" | "changed" | "missing";
};

/** Each summary against the entry with its id: intact, changed since, or missing. */
async function summaryStatuses(db: Db, table: "spending" | SourceTable): Promise<RowStatus[]> {
  const sql =
    table === "spending"
      ? `select s.id, s.user_id as "userId", s.month, s.category as label, s.currency,
           s.value::text as "summaryValue", e.value::text as "entryValue",
           case when e.id is null then 'missing'
                when e.user_id = s.user_id and e.month = s.month and e.category = s.category
                 and e.currency = s.currency and e.value = s.value then 'intact'
                else 'changed' end as status
         from ${SPENDING.summaries} s left join ${SPENDING.entries} e on e.id = s.id`
      : `select s.id, s.user_id as "userId", s.month, s.name as label, s.currency,
           s.value::text as "summaryValue", e.value::text as "entryValue",
           case when e.id is null then 'missing'
                when e.user_id = s.user_id and e.month = s.month and e.value = s.value
                 and src.currency = s.currency then 'intact'
                else 'changed' end as status
         from ${table.summaries} s
         left join ${table.entries} e on e.id = s.id
         left join ${table.sources} src on src.id = e.source_id`;
  const { rows } = await db.query<RowStatus>(`${sql} order by 2, 3, 4, 5`);
  return rows;
}

type TotalMismatch = {
  userId: string;
  month: string;
  currency: string;
  expected: string | null;
  actual: string | null;
};

/**
 * Per (user, month, currency): entries only must equal the entries that aren't migrated
 * summaries plus the summaries. Holds after the first apply and after any re-run.
 * Sums are Postgres numeric: exact.
 */
async function totalMismatches(
  db: Db,
  entryRows: string,
  summaryRows: string
): Promise<TotalMismatch[]> {
  const { rows } = await db.query<TotalMismatch>(
    `with entry_rows as (${entryRows}),
          summary_rows as (${summaryRows}),
          expected as (
            select user_id, month, currency, sum(value) as total from (
              select user_id, month, currency, value from entry_rows e
                where not exists (select 1 from summary_rows s where s.id = e.id)
              union all
              select user_id, month, currency, value from summary_rows
            ) x group by user_id, month, currency),
          actual as (
            select user_id, month, currency, sum(value) as total
            from entry_rows group by user_id, month, currency)
     select coalesce(a.user_id, x.user_id) as "userId",
            coalesce(a.month, x.month) as month,
            coalesce(a.currency, x.currency) as currency,
            x.total::text as expected, a.total::text as actual
     from actual a full join expected x
       on a.user_id = x.user_id and a.month = x.month and a.currency = x.currency
     where a.total is distinct from x.total
     order by 1, 2, 3`
  );
  return rows;
}

// ─── Dry run ─────────────────────────────────────────────────────────────────

function users(...maps: Map<string, unknown>[]): string[] {
  return [...new Set(maps.flatMap((m) => [...m.keys()]))].sort();
}

function groupByUser<T extends { userId: string }>(items: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(item.userId, [...(out.get(item.userId) ?? []), item]);
  return out;
}

async function dryRun(db: Db): Promise<boolean> {
  let blocked = 0;

  // Spending
  {
    const { plan, total } = await pendingSpendingPlan(db);
    const summariesByUser = await countByUser(db, SPENDING.summaries);
    const entriesByUser = await countByUser(db, SPENDING.entries);
    const pendingByUser = await pendingCountByUser(db, SPENDING.summaries, SPENDING.entries);
    const toCreate = groupByUser(plan.categoriesToCreate);
    heading(`${SPENDING.label} (${SPENDING.summaries} → ${SPENDING.entries}): ${total} summaries`);
    for (const user of users(summariesByUser)) {
      const all = summariesByUser.get(user) ?? 0;
      const pending = pendingByUser.get(user) ?? 0;
      const now = entriesByUser.get(user) ?? 0;
      console.log(`  User ${user}`);
      console.log(
        `    summaries: ${all}   already migrated: ${all - pending}   to migrate: ${pending}`
      );
      const cats = toCreate.get(user) ?? [];
      console.log(
        cats.length === 0
          ? "    categories to create: none"
          : `    ⚠ categories to create (name no longer in the list): ${cats
              .map((c) => `"${c.name}" (${plural(c.summaryCount, "summary", "summaries")})`)
              .join(", ")}`
      );
      console.log(`    ${SPENDING.entries} rows: ${now} now → ${now + pending} after`);
    }
  }

  // Income and assets
  for (const t of SOURCE_TABLES) {
    const { plan, total, userBySummary } = await pendingSourcePlan(db, t);
    const summariesByUser = await countByUser(db, t.summaries);
    const entriesByUser = await countByUser(db, t.entries);
    const pendingByUser = await pendingCountByUser(db, t.summaries, t.entries);
    const matchedByUser = new Map<string, number>();
    const createdIds = new Set(plan.sourcesToCreate.map((s) => s.id));
    for (const link of plan.links) {
      if (createdIds.has(link.sourceId)) continue;
      const user = userBySummary.get(link.summaryId) ?? "?";
      matchedByUser.set(user, (matchedByUser.get(user) ?? 0) + 1);
    }
    const toCreate = groupByUser(plan.sourcesToCreate);
    const other = groupByUser(plan.otherCurrency);
    const ambiguous = groupByUser(plan.ambiguous);
    blocked += plan.ambiguous.length;

    heading(`${t.label} (${t.summaries} → ${t.entries}): ${total} summaries`);
    for (const user of users(summariesByUser)) {
      const all = summariesByUser.get(user) ?? 0;
      const pending = pendingByUser.get(user) ?? 0;
      const now = entriesByUser.get(user) ?? 0;
      const ambiguousRows = (ambiguous.get(user) ?? []).reduce((n, a) => n + a.summaryCount, 0);
      console.log(`  User ${user}`);
      console.log(
        `    summaries: ${all}   already migrated: ${all - pending}   to migrate: ${pending}`
      );
      console.log(`    matched to one source: ${matchedByUser.get(user) ?? 0}`);
      const created = toCreate.get(user) ?? [];
      console.log(
        created.length === 0
          ? "    sources to create: none"
          : `    ⚠ sources to create (no match): ${created
              .map(
                (s) =>
                  `"${s.name}" ${s.currency} (${plural(s.summaryCount, "summary", "summaries")})`
              )
              .join(", ")}`
      );
      for (const w of other.get(user) ?? []) {
        console.log(
          `    ⚠ same name, other currency: "${w.name}" ${w.currency} (existing source in ${w.existingCurrencies.join(", ")}): a separate source is created`
        );
      }
      for (const a of ambiguous.get(user) ?? []) {
        console.log(
          `    ✖ ambiguous: "${a.name}" ${a.currency} matches ${a.sourceIds.length} sources (${a.sourceIds.join(", ")}), ${plural(a.summaryCount, "summary", "summaries")}. Fix by hand, then run again.`
        );
      }
      console.log(
        `    ${t.entries} rows: ${now} now → ${now + pending - ambiguousRows} after${ambiguousRows ? ` (+${ambiguousRows} once the ambiguous ones are fixed)` : ""}`
      );
    }
  }

  // Totals before: entries + summaries, the way the app adds them up today.
  heading("Per-month totals before (entries + summaries, original currency)");
  const { rows } = await db.query<{
    kind: string;
    userId: string;
    month: string;
    currency: string;
    total: string;
  }>(
    `select kind, user_id as "userId", month, currency, sum(value)::text as total from (
       select 'spending' as kind, user_id, month, currency, value from (${SPENDING_ENTRY_ROWS}) a
       union all select 'spending', user_id, month, currency, value from (${SPENDING_SUMMARY_ROWS}) b
       ${SOURCE_TABLES.map(
         (t) => `
       union all select '${t.label.toLowerCase()}', user_id, month, currency, value from (${sourceEntryRows(t)}) c
       union all select '${t.label.toLowerCase()}', user_id, month, currency, value from (${sourceSummaryRows(t)}) d`
       ).join("")}
     ) x
     group by kind, user_id, month, currency
     order by kind collate "C", user_id collate "C", month collate "C", currency collate "C"`
  );
  console.table(rows);

  heading("Result");
  if (blocked > 0) {
    console.log(
      `  BLOCKED: ${plural(blocked, "ambiguous match", "ambiguous matches")}. Apply refuses to run until fixed.`
    );
    return false;
  }
  console.log("  Ready to apply. Nothing was written.");
  return true;
}

async function pendingCountByUser(
  db: Db,
  summaries: string,
  entries: string
): Promise<Map<string, number>> {
  const { rows } = await db.query<{ userId: string; n: string }>(
    `select s.user_id as "userId", count(*) as n from ${summaries} s
     where not exists (select 1 from ${entries} e where e.id = s.id)
     group by s.user_id`
  );
  return new Map(rows.map((r) => [r.userId, Number(r.n)]));
}

// ─── Apply ───────────────────────────────────────────────────────────────────

class CheckFailed extends Error {}

async function inTransaction(
  db: Db,
  label: string,
  tables: string[],
  fn: () => Promise<string>
): Promise<void> {
  await db.query("begin");
  try {
    // Reads stay possible; no one can write these tables until commit.
    await db.query(`lock table ${tables.join(", ")} in share row exclusive mode`);
    const outcome = await fn();
    await db.query("commit");
    console.log(`  ✓ ${label}: ${outcome}`);
  } catch (err) {
    await db.query("rollback");
    console.log(`  ✖ ${label}: rolled back, nothing written.`);
    throw err;
  }
}

async function checkAll(
  db: Db,
  table: "spending" | SourceTable,
  entryRows: string,
  summaryRows: string
): Promise<void> {
  const statuses = await summaryStatuses(db, table);
  const bad = statuses.filter((s) => s.status !== "intact");
  if (bad.length > 0) {
    printStatuses(bad);
    throw new CheckFailed(`${bad.length} summaries without an identical entry`);
  }
  const mismatches = await totalMismatches(db, entryRows, summaryRows);
  if (mismatches.length > 0) {
    console.table(mismatches);
    throw new CheckFailed(`${mismatches.length} month totals differ`);
  }
}

async function applySpending(db: Db): Promise<void> {
  await inTransaction(
    db,
    SPENDING.label,
    [SPENDING.summaries, SPENDING.entries, SPENDING.categories],
    async () => {
      const { plan } = await pendingSpendingPlan(db);
      if (plan.summaryIds.length === 0) return "nothing to migrate";

      const before = await countRows(db, SPENDING.entries);
      if (plan.categoriesToCreate.length > 0) {
        await db.query(
          `insert into ${SPENDING.categories} (user_id, name)
           select * from unnest($1::text[], $2::text[])`,
          [plan.categoriesToCreate.map((c) => c.userId), plan.categoriesToCreate.map((c) => c.name)]
        );
      }
      const inserted = await db.query(
        `insert into ${SPENDING.entries}
           (id, user_id, category, value, month, currency, created_at, updated_at)
         select s.id, s.user_id, s.category, s.value, s.month, s.currency, s.created_at, s.created_at
         from ${SPENDING.summaries} s where s.id = any($1::uuid[])
         on conflict (id) do nothing`,
        [plan.summaryIds]
      );
      await checkCounts(
        db,
        SPENDING.entries,
        before,
        inserted.rowCount ?? 0,
        plan.summaryIds.length
      );
      await checkAll(db, "spending", SPENDING_ENTRY_ROWS, SPENDING_SUMMARY_ROWS);
      return `${plural(inserted.rowCount ?? 0, "entry", "entries")}, ${plural(plan.categoriesToCreate.length, "category", "categories")} created`;
    }
  );
}

async function applySourceTable(db: Db, t: SourceTable): Promise<void> {
  await inTransaction(db, t.label, [t.summaries, t.entries, t.sources], async () => {
    const { plan } = await pendingSourcePlan(db, t);
    if (plan.ambiguous.length > 0) {
      throw new CheckFailed(`${plan.ambiguous.length} ambiguous matches: run dry-run for details`);
    }
    if (plan.links.length === 0) return "nothing to migrate";

    const before = await countRows(db, t.entries);
    if (plan.sourcesToCreate.length > 0) {
      const s = plan.sourcesToCreate;
      await db.query(
        `insert into ${t.sources} (id, user_id, name, currency)
         select * from unnest($1::uuid[], $2::text[], $3::text[], $4::text[])`,
        [s.map((x) => x.id), s.map((x) => x.userId), s.map((x) => x.name), s.map((x) => x.currency)]
      );
    }
    const inserted = await db.query(
      `insert into ${t.entries} (id, user_id, source_id, value, month, created_at, updated_at)
       select s.id, s.user_id, l.source_id, s.value, s.month, s.created_at, s.created_at
       from unnest($1::uuid[], $2::uuid[]) as l(summary_id, source_id)
       join ${t.summaries} s on s.id = l.summary_id
       on conflict (id) do nothing`,
      [plan.links.map((l) => l.summaryId), plan.links.map((l) => l.sourceId)]
    );
    await checkCounts(db, t.entries, before, inserted.rowCount ?? 0, plan.links.length);
    await checkAll(db, t, sourceEntryRows(t), sourceSummaryRows(t));
    return `${plural(inserted.rowCount ?? 0, "entry", "entries")}, ${plural(plan.sourcesToCreate.length, "source", "sources")} created`;
  });
}

async function checkCounts(
  db: Db,
  table: string,
  before: number,
  inserted: number,
  planned: number
): Promise<void> {
  if (inserted !== planned) {
    throw new CheckFailed(`${table}: planned ${planned} entries but inserted ${inserted}`);
  }
  const after = await countRows(db, table);
  if (after !== before + inserted) {
    throw new CheckFailed(`${table}: ${before} + ${inserted} inserted ≠ ${after} rows after`);
  }
}

async function apply(db: Db): Promise<boolean> {
  heading("Planning");
  for (const t of SOURCE_TABLES) {
    const { plan } = await pendingSourcePlan(db, t);
    if (plan.ambiguous.length > 0) {
      console.log(
        `  ✖ ${t.label}: ${plural(plan.ambiguous.length, "ambiguous match", "ambiguous matches")}. Run dry-run.`
      );
      return false;
    }
  }
  console.log("  No ambiguous matches.");

  heading("Applying (one transaction per table)");
  try {
    await applySpending(db);
    for (const t of SOURCE_TABLES) await applySourceTable(db, t);
  } catch (err) {
    if (err instanceof CheckFailed) {
      console.log(`\n  Stopped: ${err.message}. Tables already committed stay migrated;`);
      console.log("  re-running apply is safe (it skips what's done).");
      return false;
    }
    throw err;
  }
  heading("Result");
  console.log("  Applied and checked. Run verify to check again at any time.");
  return true;
}

// ─── Verify ──────────────────────────────────────────────────────────────────

function printStatuses(rows: RowStatus[]): void {
  console.table(
    rows.map((r) => ({
      status: r.status,
      user: r.userId,
      month: r.month,
      name: r.label,
      currency: r.currency,
      summary: r.summaryValue,
      entry: r.entryValue ?? "",
    }))
  );
}

async function verify(db: Db): Promise<boolean> {
  let ok = true;
  const tables: {
    label: string;
    table: "spending" | SourceTable;
    entry: string;
    summary: string;
  }[] = [
    {
      label: SPENDING.label,
      table: "spending",
      entry: SPENDING_ENTRY_ROWS,
      summary: SPENDING_SUMMARY_ROWS,
    },
    ...SOURCE_TABLES.map((t) => ({
      label: t.label,
      table: t,
      entry: sourceEntryRows(t),
      summary: sourceSummaryRows(t),
    })),
  ];

  for (const { label, table, entry, summary } of tables) {
    heading(label);
    const statuses = await summaryStatuses(db, table);
    const count = (s: RowStatus["status"]) => statuses.filter((r) => r.status === s).length;
    console.log(
      `  summaries: ${statuses.length}   intact: ${count("intact")}   changed since: ${count("changed")}   missing: ${count("missing")}`
    );
    const bad = statuses.filter((r) => r.status !== "intact");
    if (bad.length > 0) {
      ok = false;
      printStatuses(bad);
    }
    const mismatches = await totalMismatches(db, entry, summary);
    if (mismatches.length === 0) {
      console.log("  month totals: all match");
    } else {
      ok = false;
      console.log(`  month totals: ${mismatches.length} differ`);
      console.table(mismatches);
    }
  }

  heading("Result");
  console.log(
    ok
      ? "  OK: every summary has an identical entry and every month total matches."
      : "  NOT OK. Right after apply this means a problem. Later, edits you made or Combine\n  explain 'changed', 'missing' and total differences: check each against what you did."
  );
  return ok;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function heading(text: string): void {
  console.log(`\n== ${text}`);
}

async function confirmTarget(host: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`\nAbout to WRITE to ${host}. Type the host to continue: `);
  rl.close();
  return answer.trim() === host;
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? "dry-run";
  if (arg !== "dry-run" && arg !== "apply" && arg !== "verify") {
    console.error("Usage: migrate-summaries [dry-run|apply|verify]");
    process.exitCode = 2;
    return;
  }
  const mode: Mode = arg;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exitCode = 2;
    return;
  }
  const host = new URL(url).host;
  console.log(`Financer summaries migration: ${mode.toUpperCase()} on ${host}`);
  if (mode === "dry-run") console.log("Nothing is written in this mode.");

  if (mode === "apply" && !(await confirmTarget(host))) {
    console.log("Host didn't match. Nothing written.");
    process.exitCode = 1;
    return;
  }

  const db = new pg.Client({ connectionString: url });
  await db.connect();
  try {
    const ok =
      mode === "dry-run" ? await dryRun(db) : mode === "apply" ? await apply(db) : await verify(db);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
