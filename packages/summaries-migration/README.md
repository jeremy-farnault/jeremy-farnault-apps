# Summaries migration (one-off)

Moves Financer's closed-month summaries (`financer_summaries`, `financer_income_summaries`, `financer_asset_summaries`) back into entries. Spec: *Combine Entries* in the documentation vault, tickets 01 and 02. **This package is deleted with the summaries tables (ticket 04).**

It's a package of its own so the apps' dependencies don't change: it talks to Postgres with `pg` (node-postgres), which works with Neon's direct connection and with a plain local Postgres.

## Modes

```bash
pnpm migrate:summaries dry-run   # default: report only, writes nothing
pnpm migrate:summaries apply     # asks you to type the host, then one transaction per table
pnpm migrate:summaries verify    # read-only checks, any time
```

`DATABASE_URL` must be set in the shell. The script never reads `.env`, so it can't run against production by accident:

```bash
read -rs DATABASE_URL && export DATABASE_URL
```

Use Neon's **direct** connection (no `-pooler` in the host).

## What makes it safe

- **Apply only inserts.** It never updates or deletes a summary or an existing entry.
- **Each entry reuses its summary's `id`** (and `created_at`). A second apply inserts nothing; deleting the entries whose id is a summary id undoes it exactly.
- **Values, months, currencies and dates are copied in SQL** from the summary rows. JavaScript only decides which source an income or asset entry is attached to (`src/plan.ts`, unit-tested).
- **Ambiguous matches block apply** (two sources with the same name + currency).
- **Each table's transaction checks itself before commit**, and rolls back if any check fails: every summary has an identical entry (same id, user, month, value, currency); the entry count grew by exactly the rows inserted; every (user, month, currency) total is identical, in exact `numeric` sums.
- **Tables are locked for writes** during their transaction (reads still work).

## Matching rules

| Summary | Becomes |
|---|---|
| Spending | A spending entry, as is. If its category name is no longer in the list, the category is created (flagged ⚠). |
| Income / asset, one source with the same name + currency | An entry on that source. |
| Income / asset, no such source | A new source with that name and currency, then an entry on it (flagged ⚠, and a separate ⚠ when the name exists in another currency). |
| Income / asset, several such sources | Nothing: ✖ ambiguous, apply refuses. Fix by hand and run again. |

## After apply

`verify` is strict: right after apply it must say OK. Later, your own edits and Combine change or remove migrated entries, and `verify` lists each one as *changed since* or *missing*, with the month totals that moved. Check them against what you did.
