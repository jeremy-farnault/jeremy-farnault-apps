// Plans the one-off move of closed-month summaries back into entries (Combine Entries,
// ticket 01). Pure: no database access. It only decides *where* each summary goes;
// the script copies values, months, currencies and dates in SQL, so amounts never pass
// through JavaScript numbers.
//
// Deleted with the summaries tables (Financer chore "Drop the summaries tables").

/**
 * Financer's built-in spending categories: defined in its code, never stored in the
 * categories table. A copy of `SPENDING_CATEGORIES` in Financer's constants; a test
 * fails if the two differ.
 */
export const BUILT_IN_SPENDING_CATEGORIES = [
  "Entertainment",
  "Everyday",
  "Groceries",
  "Health",
  "Housing",
  "Presents & Hobbies",
  "Restaurant",
  "Transport",
  "Other",
] as const;

export type SourceSummary = {
  id: string;
  userId: string;
  name: string;
  currency: string;
};

export type Source = {
  id: string;
  userId: string;
  name: string;
  currency: string;
};

export type SpendingSummary = {
  id: string;
  userId: string;
  category: string;
};

export type Category = {
  userId: string;
  name: string;
};

/** A summary and the source its entry will be attached to. */
export type SourceLink = {
  summaryId: string;
  sourceId: string;
};

export type SourceToCreate = {
  id: string;
  userId: string;
  name: string;
  currency: string;
  summaryCount: number;
};

/** More than one source has this name + currency: the script doesn't guess. */
export type AmbiguousMatch = {
  userId: string;
  name: string;
  currency: string;
  sourceIds: string[];
  summaryCount: number;
};

/** No source with this name + currency, but one with the same name in another currency. */
export type OtherCurrencyWarning = {
  userId: string;
  name: string;
  currency: string;
  existingCurrencies: string[];
};

export type SourcePlan = {
  links: SourceLink[];
  matchedCount: number;
  sourcesToCreate: SourceToCreate[];
  ambiguous: AmbiguousMatch[];
  otherCurrency: OtherCurrencyWarning[];
};

export type CategoryToCreate = {
  userId: string;
  name: string;
  summaryCount: number;
};

export type SpendingPlan = {
  summaryIds: string[];
  categoriesToCreate: CategoryToCreate[];
};

function key(...parts: string[]): string {
  return JSON.stringify(parts);
}

/**
 * Income and asset summaries are matched to the same user's source by name + currency.
 * No match → a source is created (`newId` gives its id). Several matches → ambiguous,
 * and those summaries get no link.
 */
export function planSourceSummaries(
  summaries: SourceSummary[],
  sources: Source[],
  newId: () => string
): SourcePlan {
  const sourcesByNameAndCurrency = new Map<string, Source[]>();
  const currenciesByName = new Map<string, Set<string>>();
  for (const source of sources) {
    const exact = key(source.userId, source.name, source.currency);
    sourcesByNameAndCurrency.set(exact, [...(sourcesByNameAndCurrency.get(exact) ?? []), source]);
    const byName = key(source.userId, source.name);
    const currencies = currenciesByName.get(byName) ?? new Set<string>();
    currencies.add(source.currency);
    currenciesByName.set(byName, currencies);
  }

  const links: SourceLink[] = [];
  let matchedCount = 0;
  const toCreate = new Map<string, SourceToCreate>();
  const ambiguous = new Map<string, AmbiguousMatch>();
  const otherCurrency = new Map<string, OtherCurrencyWarning>();

  for (const summary of summaries) {
    const exact = key(summary.userId, summary.name, summary.currency);
    const matches = sourcesByNameAndCurrency.get(exact) ?? [];

    const [only] = matches;
    if (only && matches.length === 1) {
      links.push({ summaryId: summary.id, sourceId: only.id });
      matchedCount++;
      continue;
    }

    if (matches.length > 1) {
      const existing = ambiguous.get(exact);
      if (existing) existing.summaryCount++;
      else
        ambiguous.set(exact, {
          userId: summary.userId,
          name: summary.name,
          currency: summary.currency,
          sourceIds: matches.map((s) => s.id).sort(),
          summaryCount: 1,
        });
      continue;
    }

    let created = toCreate.get(exact);
    if (created) {
      created.summaryCount++;
    } else {
      created = {
        id: newId(),
        userId: summary.userId,
        name: summary.name,
        currency: summary.currency,
        summaryCount: 1,
      };
      toCreate.set(exact, created);
      const otherCurrencies = currenciesByName.get(key(summary.userId, summary.name));
      if (otherCurrencies) {
        otherCurrency.set(exact, {
          userId: summary.userId,
          name: summary.name,
          currency: summary.currency,
          existingCurrencies: [...otherCurrencies].sort(),
        });
      }
    }
    links.push({ summaryId: summary.id, sourceId: created.id });
  }

  return {
    links,
    matchedCount,
    sourcesToCreate: [...toCreate.values()],
    ambiguous: [...ambiguous.values()],
    otherCurrency: [...otherCurrency.values()],
  };
}

/**
 * Spending summaries become entries as they are. A category name that is neither
 * built in (defined in Financer's code, never stored) nor in the user's own list
 * (renaming a category never updated old summaries) is created, once.
 */
export function planSpendingSummaries(
  summaries: SpendingSummary[],
  categories: Category[],
  builtInCategories: readonly string[]
): SpendingPlan {
  const known = new Set(categories.map((c) => key(c.userId, c.name)));
  const builtIn = new Set(builtInCategories);
  const toCreate = new Map<string, CategoryToCreate>();

  for (const summary of summaries) {
    const k = key(summary.userId, summary.category);
    if (builtIn.has(summary.category) || known.has(k)) continue;
    const existing = toCreate.get(k);
    if (existing) existing.summaryCount++;
    else toCreate.set(k, { userId: summary.userId, name: summary.category, summaryCount: 1 });
  }

  return {
    summaryIds: summaries.map((s) => s.id),
    categoriesToCreate: [...toCreate.values()],
  };
}
