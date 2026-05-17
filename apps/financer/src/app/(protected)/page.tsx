import { CloseMonthButton } from "@/components/close-month-button";
import { MonthNav } from "@/components/month-nav";
import { SpendingCta } from "@/components/spending-cta";
import { SpendingList } from "@/components/spending-list";
import { ViewToggle } from "@/components/view-toggle";
import { getAvailableMonths, getSpendingForMonth, hasOpenEntries } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
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
  const view = viewParam === "savings" ? "savings" : "spending";
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

  return (
    <main className="w-full px-4 pt-6 pb-24 flex flex-col gap-6">
      <ViewToggle view={view} />
      {view === "spending" && (
        <>
          <MonthNav month={month} />
          <SpendingList data={spendingData} />
          {openEntries && <CloseMonthButton month={month} spendingData={spendingData} />}
          <SpendingCta viewedMonth={month} availableMonths={availableMonths} />
        </>
      )}
      {view === "savings" && <p className="text-sm text-(--grey-500)">Savings coming soon.</p>}
    </main>
  );
}
