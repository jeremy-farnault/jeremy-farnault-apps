import { MedicinesList } from "@/components/medicines-list";
import { getMonthBounds, parseMonthParam } from "@/lib/cycle";
import { getMedicinesMonthView, getSymptomLogsMonthView, getSymptoms } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function DoserPage({ searchParams }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user.id ?? "";

  const today = new Date().toISOString().slice(0, 10);
  const [currentYear, currentMonth] = today.split("-").map(Number) as [number, number];

  const { month: monthParam } = await searchParams;
  const { year, month } = parseMonthParam(monthParam, { year: currentYear, month: currentMonth });

  const { startDate, endDate } = getMonthBounds(year, month);
  const [monthViews, symptoms, symptomLogsByDate] = await Promise.all([
    getMedicinesMonthView(userId, startDate, endDate),
    getSymptoms(userId),
    getSymptomLogsMonthView(userId, startDate, endDate),
  ]);

  return (
    <MedicinesList
      monthViews={monthViews}
      today={today}
      year={year}
      month={month}
      currentYear={currentYear}
      currentMonth={currentMonth}
      symptoms={symptoms}
      symptomLogsByDate={symptomLogsByDate}
    />
  );
}
