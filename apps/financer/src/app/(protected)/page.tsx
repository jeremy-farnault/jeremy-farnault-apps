import { AssetSourcesList } from "@/components/asset-sources-list";
import { AssetsChart } from "@/components/assets-chart";
import { AssetsCta } from "@/components/assets-cta";
import { AssetsList } from "@/components/assets-list";
import { CombineButton, type CombinePreview } from "@/components/combine-button";
import { DetailChart, type DetailSeries } from "@/components/detail-chart";
import { IncomeChart } from "@/components/income-chart";
import { IncomeCta } from "@/components/income-cta";
import { IncomeList } from "@/components/income-list";
import { IncomeSourcesList } from "@/components/income-sources-list";
import { MonthNav } from "@/components/month-nav";
import { OverviewChart } from "@/components/overview-chart";
import { type OverviewSub, OverviewSubToggle } from "@/components/overview-sub-toggle";
import { SpendingCategoriesList } from "@/components/spending-categories-list";
import { SpendingChart } from "@/components/spending-chart";
import { SpendingCta } from "@/components/spending-cta";
import { SpendingList } from "@/components/spending-list";
import { ViewToggle } from "@/components/view-toggle";
import { planSourceCombine, planSpendingCombine } from "@/lib/combine";
import {
  ASSET_SOURCE_COLORS,
  CATEGORY_COLORS,
  FALLBACK_COLOR,
  INCOME_SOURCE_COLORS,
  SPENDING_CATEGORY_COLORS,
} from "@/lib/constants";
import {
  type AssetEntryRow,
  type AssetRow,
  type AssetSourceRow,
  type IncomeEntryRow,
  type IncomeRow,
  type IncomeSourceRow,
  type MonthlyTotals,
  type SpendingCategoryRow,
  type SpendingEntryRow,
  type SpendingRow,
  getAssetEntriesForMonth,
  getAssetSources,
  getAssetsForMonth,
  getHomeCurrency,
  getIncomeEntriesForMonth,
  getIncomeForMonth,
  getIncomeSources,
  getMonthlyTotals,
  getSpendingCategories,
  getSpendingEntriesForMonth,
  getSpendingForMonth,
} from "@/lib/queries";
import { auth } from "@jf/auth";
import { getExchangeRates } from "@jf/db";
import { headers } from "next/headers";

function convertSpendingRows(
  data: SpendingRow[],
  rates: Record<string, number>,
  homeCurrency: string
): SpendingRow[] {
  const rateTo = rates[homeCurrency];
  const merged = new Map<string, number>();
  for (const row of data) {
    const rateFrom = rates[row.currency];
    const converted = rateFrom && rateTo ? row.total * (rateTo / rateFrom) : row.total;
    merged.set(row.category, (merged.get(row.category) ?? 0) + converted);
  }
  return Array.from(merged.entries()).map(([category, total]) => ({
    category,
    currency: homeCurrency,
    total,
  }));
}

function convertAssetRows(
  data: AssetRow[],
  rates: Record<string, number>,
  homeCurrency: string
): AssetRow[] {
  const rateTo = rates[homeCurrency];
  const merged = new Map<string, { sourceId: string; total: number }>();
  for (const row of data) {
    const rateFrom = rates[row.currency];
    const converted = rateFrom && rateTo ? row.total * (rateTo / rateFrom) : row.total;
    const existing = merged.get(row.name);
    if (existing) {
      existing.total += converted;
    } else {
      merged.set(row.name, { sourceId: row.sourceId, total: converted });
    }
  }
  return Array.from(merged.entries()).map(([name, { sourceId, total }]) => ({
    name,
    sourceId,
    currency: homeCurrency,
    total,
  }));
}

function convertIncomeRows(
  data: IncomeRow[],
  rates: Record<string, number>,
  homeCurrency: string
): IncomeRow[] {
  const rateTo = rates[homeCurrency];
  const merged = new Map<string, { sourceId: string; total: number }>();
  for (const row of data) {
    const rateFrom = rates[row.currency];
    const converted = rateFrom && rateTo ? row.total * (rateTo / rateFrom) : row.total;
    const existing = merged.get(row.name);
    if (existing) {
      existing.total += converted;
    } else {
      merged.set(row.name, { sourceId: row.sourceId, total: converted });
    }
  }
  return Array.from(merged.entries()).map(([name, { sourceId, total }]) => ({
    name,
    sourceId,
    currency: homeCurrency,
    total,
  }));
}

// Combine previews: the groups the button would merge, from the grouping the actions use.
// Entry values come from numeric(12, 2) columns, so toFixed(2) gives back their exact text.
function spendingCombinePreview(entries: SpendingEntryRow[]): CombinePreview[] {
  return planSpendingCombine(entries.map((e) => ({ ...e, value: e.value.toFixed(2) }))).map(
    (g) => ({
      key: `${g.category}::${g.currency}`,
      label: g.category,
      currency: g.currency,
      count: g.ids.length,
      total: Number(g.total),
    })
  );
}

function sourceCombinePreview(
  entries: (AssetEntryRow | IncomeEntryRow)[],
  sources: (AssetSourceRow | IncomeSourceRow)[]
): CombinePreview[] {
  return planSourceCombine(entries.map((e) => ({ ...e, value: e.value.toFixed(2) }))).map((g) => {
    const source = sources.find((s) => s.id === g.sourceId);
    return {
      key: g.sourceId,
      label: source?.name ?? "Unknown source",
      currency: source?.currency ?? "",
      count: g.ids.length,
      total: Number(g.total),
    };
  });
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

function isValidMonth(s?: string): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

export default async function FinancerPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; sub?: string }>;
}) {
  const { view: viewParam, month: monthParam, sub: subParam } = await searchParams;
  const view =
    viewParam === "assets"
      ? "assets"
      : viewParam === "income"
        ? "income"
        : viewParam === "overview"
          ? "overview"
          : "spending";
  const sub: OverviewSub =
    subParam === "spending" || subParam === "assets" || subParam === "income" ? subParam : "global";
  const month = isValidMonth(monthParam) ? monthParam : getCurrentMonth();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [spendingData, spendingHomeCurrency, spendingRates, spendingEntries, spendingCategories] =
    view === "spending"
      ? await Promise.all([
          getSpendingForMonth(userId, month),
          getHomeCurrency(userId),
          getExchangeRates(),
          getSpendingEntriesForMonth(userId, month),
          getSpendingCategories(userId),
        ])
      : [[], "USD", {}, [], []];

  const [assetsData, assetSources, assetsHomeCurrency, assetsRates, assetEntries] =
    view === "assets"
      ? await Promise.all([
          getAssetsForMonth(userId, month),
          getAssetSources(userId),
          getHomeCurrency(userId),
          getExchangeRates(),
          getAssetEntriesForMonth(userId, month),
        ])
      : [[], [], "USD", {}, []];

  const [incomeData, incomeSources, incomeHomeCurrency, incomeRates, incomeEntries] =
    view === "income"
      ? await Promise.all([
          getIncomeForMonth(userId, month),
          getIncomeSources(userId),
          getHomeCurrency(userId),
          getExchangeRates(),
          getIncomeEntriesForMonth(userId, month),
        ])
      : [[], [], "USD", {}, []];

  const [monthlyTotals, overviewAssetSources, overviewIncomeSources, overviewSpendingCategories] =
    view === "overview"
      ? await Promise.all([
          getMonthlyTotals(userId, getLast12Months()),
          getAssetSources(userId),
          getIncomeSources(userId),
          getSpendingCategories(userId),
        ])
      : [[], [], [], []];

  const typedSpendingCategories = spendingCategories as SpendingCategoryRow[];
  const categoryColors: Record<string, string> = {
    ...CATEGORY_COLORS,
    ...Object.fromEntries(
      typedSpendingCategories.map((c, i) => [
        c.name,
        c.color ?? SPENDING_CATEGORY_COLORS[i % SPENDING_CATEGORY_COLORS.length] ?? FALLBACK_COLOR,
      ])
    ),
  };

  // Overview detail sub-tabs: pivot the 12-month totals into one series per item.
  const overviewMonths = (monthlyTotals as MonthlyTotals[]).map((m) => m.month);
  const overviewCategoryColors: Record<string, string> = {
    ...CATEGORY_COLORS,
    ...Object.fromEntries(
      (overviewSpendingCategories as SpendingCategoryRow[]).map((c, i) => [
        c.name,
        c.color ?? SPENDING_CATEGORY_COLORS[i % SPENDING_CATEGORY_COLORS.length] ?? FALLBACK_COLOR,
      ])
    ),
  };

  function buildDetailSeries(
    pick: (m: MonthlyTotals) => Record<string, number>,
    colorFor: (name: string, index: number) => string
  ): DetailSeries[] {
    const totals = monthlyTotals as MonthlyTotals[];
    const names = Array.from(new Set(totals.flatMap((m) => Object.keys(pick(m)))));
    return names.map((name, i) => ({
      name,
      color: colorFor(name, i),
      values: totals.map((m) => pick(m)[name] ?? null),
    }));
  }

  const spendingDetailSeries = buildDetailSeries(
    (m) => m.spendingByCategory,
    (name) => overviewCategoryColors[name] ?? FALLBACK_COLOR
  );
  const assetDetailSeries = buildDetailSeries(
    (m) => m.assets,
    (name, i) =>
      overviewAssetSources.find((s) => s.name === name)?.color ??
      ASSET_SOURCE_COLORS[i % ASSET_SOURCE_COLORS.length] ??
      FALLBACK_COLOR
  );
  const incomeDetailSeries = buildDetailSeries(
    (m) => m.income,
    (name, i) =>
      overviewIncomeSources.find((s) => s.name === name)?.color ??
      INCOME_SOURCE_COLORS[i % INCOME_SOURCE_COLORS.length] ??
      FALLBACK_COLOR
  );

  return (
    <main className="w-full px-4 pt-6 pb-24 flex flex-col gap-10 sm:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggle view={view} />
        {view !== "overview" && (
          <div className="flex justify-center sm:justify-end">
            <MonthNav month={month} />
          </div>
        )}
        {view === "overview" && (
          <div className="flex justify-center sm:justify-end">
            <OverviewSubToggle sub={sub} />
          </div>
        )}
      </div>
      {view === "spending" && (
        <>
          <SpendingChart
            data={convertSpendingRows(spendingData, spendingRates, spendingHomeCurrency)}
            categoryColors={categoryColors}
          />
          <SpendingCategoriesList categories={typedSpendingCategories} />
          <SpendingList
            homeCurrency={spendingHomeCurrency}
            rates={spendingRates}
            entries={spendingEntries}
            categoryColors={categoryColors}
            customCategories={typedSpendingCategories}
          />
          <CombineButton
            kind="spending"
            month={month}
            groups={spendingCombinePreview(spendingEntries)}
          />
          <SpendingCta
            viewedMonth={month}
            homeCurrency={spendingHomeCurrency}
            customCategories={typedSpendingCategories}
          />
        </>
      )}
      {view === "assets" && (
        <>
          <AssetsChart
            data={convertAssetRows(assetsData, assetsRates, assetsHomeCurrency)}
            sources={assetSources}
          />
          <AssetSourcesList sources={assetSources} month={month} entries={assetEntries} />
          <AssetsList data={assetsData} homeCurrency={assetsHomeCurrency} rates={assetsRates} />
          <CombineButton
            kind="assets"
            month={month}
            groups={sourceCombinePreview(assetEntries, assetSources)}
          />
          <AssetsCta viewedMonth={month} homeCurrency={assetsHomeCurrency} sources={assetSources} />
        </>
      )}
      {view === "income" && (
        <>
          <IncomeChart
            data={convertIncomeRows(incomeData, incomeRates, incomeHomeCurrency)}
            sources={incomeSources}
          />
          <IncomeSourcesList sources={incomeSources} month={month} entries={incomeEntries} />
          <IncomeList data={incomeData} homeCurrency={incomeHomeCurrency} rates={incomeRates} />
          <CombineButton
            kind="income"
            month={month}
            groups={sourceCombinePreview(incomeEntries, incomeSources)}
          />
          <IncomeCta
            viewedMonth={month}
            homeCurrency={incomeHomeCurrency}
            sources={incomeSources}
          />
        </>
      )}
      {view === "overview" && sub === "global" && (
        <OverviewChart
          data={monthlyTotals}
          assetSources={overviewAssetSources}
          incomeSources={overviewIncomeSources}
        />
      )}
      {view === "overview" && sub === "spending" && (
        <DetailChart
          title="Spending by category"
          months={overviewMonths}
          series={spendingDetailSeries}
        />
      )}
      {view === "overview" && sub === "assets" && (
        <DetailChart title="Assets by source" months={overviewMonths} series={assetDetailSeries} />
      )}
      {view === "overview" && sub === "income" && (
        <DetailChart title="Income by source" months={overviewMonths} series={incomeDetailSeries} />
      )}
    </main>
  );
}
