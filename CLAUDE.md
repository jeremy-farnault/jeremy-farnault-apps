# Project Guidelines

## Verification

**Do not start the dev server or run the app to verify changes.** Run the type-check instead (`bun tsc --noEmit` or `pnpm type-check` from the relevant package). The user will test the UI manually.

## Changelog

Every app has a public changelog at `/changelog`, fed by `@jf/changelog` (one file per app in `packages/changelog/src/entries/`, shared-code changes in `shared.ts`).

**A commit that ships a change a user would notice adds its changelog entry in the same commit.**

- One entry per change, not per ticket or commit: a feature split over several tickets gets one entry, with its last ticket.
- Written for portfolio visitors, not developers: what they can now do ("Log a month of spending in one go"), not how the code does it.
- `kind` is `new`, `improved` or `fixed`; `date` is the day it ships. A change to shared code that every app gets is one entry with `apps: "all"`. One that touches a few apps names them all.
- Internal work gets no entry: CI, refactors, migrations, demo fixtures, docs, tooling.

Missed entries are caught up by the `/changelog` skill, which reads the commits after `reviewedThrough` (`packages/changelog/src/checkpoint.ts`).
