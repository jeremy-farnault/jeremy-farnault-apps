import { AssetSourcesList } from "@/components/asset-sources-list";
import { AssetsCta } from "@/components/assets-cta";
import { AssetsList } from "@/components/assets-list";
import { CloseMonthButton } from "@/components/close-month-button";
import { IncomeCta } from "@/components/income-cta";
import { IncomeList } from "@/components/income-list";
import { IncomeSourcesList } from "@/components/income-sources-list";
import { MonthNav } from "@/components/month-nav";
import { OverviewChart } from "@/components/overview-chart";
import { SpendingChart } from "@/components/spending-chart";
import { SpendingCta } from "@/components/spending-cta";
import { SpendingList } from "@/components/spending-list";
import { ViewToggle } from "@/components/view-toggle";
import {
  getAssetEntriesForMonth,
  getAssetSources,
  getAssetsForMonth,
  getExchangeRates,
  getHomeCurrency,
  getIncomeEntriesForMonth,
  getIncomeForMonth,
  getIncomeSources,
  getMonthlyTotals,
  getSpendingEntriesForMonth,
  getSpendingForMonth,
  hasOpenEntries,
} from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

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
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const { view: viewParam, month: monthParam } = await searchParams;
  const view =
    viewParam === "assets"
      ? "assets"
      : viewParam === "income"
        ? "income"
        : viewParam === "overview"
          ? "overview"
          : "spending";
  const month = isValidMonth(monthParam) ? monthParam : getCurrentMonth();

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const [spendingData, openEntries, spendingHomeCurrency, spendingRates, spendingEntries] =
    view === "spending"
      ? await Promise.all([
          getSpendingForMonth(userId, month),
          hasOpenEntries(userId, month),
          getHomeCurrency(userId),
          getExchangeRates(),
          getSpendingEntriesForMonth(userId, month),
        ])
      : [[], false, "USD", {}, []];

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

  const [monthlyTotals, overviewAssetSources, overviewIncomeSources] =
    view === "overview"
      ? await Promise.all([
          getMonthlyTotals(userId, getLast12Months()),
          getAssetSources(userId),
          getIncomeSources(userId),
        ])
      : [[], [], []];

  return (
    <main className="w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ViewToggle view={view} />
        {view !== "overview" && (
          <div className="flex justify-center sm:justify-end">
            <MonthNav month={month} />
          </div>
        )}
      </div>
      {view === "spending" && (
        <>
          <SpendingChart data={spendingData} />
          <SpendingList
            data={spendingData}
            homeCurrency={spendingHomeCurrency}
            rates={spendingRates}
            isOpen={openEntries}
            entries={spendingEntries}
          />
          {openEntries && <CloseMonthButton month={month} spendingData={spendingData} />}
          <SpendingCta viewedMonth={month} homeCurrency={spendingHomeCurrency} />
        </>
      )}
      {view === "assets" && (
        <>
          <AssetSourcesList sources={assetSources} month={month} entries={assetEntries} />
          <AssetsList data={assetsData} homeCurrency={assetsHomeCurrency} rates={assetsRates} />
          <AssetsCta viewedMonth={month} homeCurrency={assetsHomeCurrency} sources={assetSources} />
        </>
      )}
      {view === "income" && (
        <>
          <IncomeSourcesList sources={incomeSources} month={month} entries={incomeEntries} />
          <IncomeList data={incomeData} homeCurrency={incomeHomeCurrency} rates={incomeRates} />
          <IncomeCta
            viewedMonth={month}
            homeCurrency={incomeHomeCurrency}
            sources={incomeSources}
          />
        </>
      )}
      {view === "overview" && (
        <OverviewChart
          data={monthlyTotals}
          assetSources={overviewAssetSources}
          incomeSources={overviewIncomeSources}
        />
      )}
    </main>
  );
}
