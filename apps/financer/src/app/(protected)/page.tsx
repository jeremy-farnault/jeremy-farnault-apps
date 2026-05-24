import { CloseMonthButton } from "@/components/close-month-button";
import { MonthNav } from "@/components/month-nav";
import { OverviewChart } from "@/components/overview-chart";
import { SavingsCta } from "@/components/savings-cta";
import { SavingsList } from "@/components/savings-list";
import { SourcesList } from "@/components/sources-list";
import { SpendingChart } from "@/components/spending-chart";
import { SpendingCta } from "@/components/spending-cta";
import { SpendingList } from "@/components/spending-list";
import { ViewToggle } from "@/components/view-toggle";
import {
  getExchangeRates,
  getHomeCurrency,
  getIncomeSources,
  getMonthlyTotals,
  getSavingsEntriesForMonth,
  getSavingsForMonth,
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
    viewParam === "savings" ? "savings" : viewParam === "overview" ? "overview" : "spending";
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

  const [savingsData, sources, homeCurrency, rates, savingsEntries] =
    view === "savings"
      ? await Promise.all([
          getSavingsForMonth(userId, month),
          getIncomeSources(userId),
          getHomeCurrency(userId),
          getExchangeRates(),
          getSavingsEntriesForMonth(userId, month),
        ])
      : [[], [], "USD", {}, []];

  const [monthlyTotals, overviewSources] =
    view === "overview"
      ? await Promise.all([getMonthlyTotals(userId, getLast12Months()), getIncomeSources(userId)])
      : [[], []];

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
      {view === "savings" && (
        <>
          <SourcesList sources={sources} month={month} entries={savingsEntries} />
          <SavingsList data={savingsData} homeCurrency={homeCurrency} rates={rates} />
          <SavingsCta viewedMonth={month} homeCurrency={homeCurrency} sources={sources} />
        </>
      )}
      {view === "overview" && <OverviewChart data={monthlyTotals} sources={overviewSources} />}
    </main>
  );
}
