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
  getAvailableMonths,
  getIncomeSources,
  getMonthlyTotals,
  getSavingsAvailableMonths,
  getSavingsForMonth,
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

  const [spendingData, availableMonths, openEntries] =
    view === "spending"
      ? await Promise.all([
          getSpendingForMonth(userId, month),
          getAvailableMonths(userId),
          hasOpenEntries(userId, month),
        ])
      : [[], [], false];

  const [savingsData, _savingsMonths, sources] =
    view === "savings"
      ? await Promise.all([
          getSavingsForMonth(userId, month),
          getSavingsAvailableMonths(userId),
          getIncomeSources(userId),
        ])
      : [[], [], []];

  const monthlyTotals =
    view === "overview" ? await getMonthlyTotals(userId, getLast12Months()) : [];

  return (
    <main className="w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      <ViewToggle view={view} />
      {view === "spending" && (
        <>
          <MonthNav month={month} />
          <SpendingChart data={spendingData} />
          <SpendingList data={spendingData} />
          {openEntries && <CloseMonthButton month={month} spendingData={spendingData} />}
          <SpendingCta viewedMonth={month} availableMonths={availableMonths} />
        </>
      )}
      {view === "savings" && (
        <>
          <MonthNav month={month} />
          <SourcesList sources={sources} month={month} savingsData={savingsData} />
          <SavingsList data={savingsData} />
          <SavingsCta />
        </>
      )}
      {view === "overview" && <OverviewChart data={monthlyTotals} />}
    </main>
  );
}
