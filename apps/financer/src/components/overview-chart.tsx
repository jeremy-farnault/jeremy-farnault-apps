"use client";

import type { MonthlyTotals } from "@/lib/queries";
import { cn } from "@jf/ui";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CURRENCY_COLORS = [
  "var(--blue-400)",
  "var(--green-400)",
  "var(--teal-400)",
  "var(--moss-400)",
  "var(--beige-400)",
  "var(--yellow-400)",
  "var(--magenta-400)",
  "var(--red-400)",
];

function formatMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OverviewChart({ data }: { data: MonthlyTotals[] }) {
  const [mode, setMode] = useState<"both" | "spending" | "savings">("both");

  const hasAnyData = data.some(
    (d) => d.spending > 0 || Object.values(d.savings).some((v) => v > 0)
  );
  if (!hasAnyData) return null;

  const allCurrencies = Array.from(new Set(data.flatMap((d) => Object.keys(d.savings))));

  const chartData = data.map((d) => ({
    month: d.month,
    spending: d.spending,
    totalSavings: Object.values(d.savings).reduce((a, b) => a + b, 0),
    ...Object.fromEntries(allCurrencies.map((c) => [`savings_${c}`, d.savings[c] ?? 0])),
  }));

  const tooltipStyle = {
    fontSize: 11,
    borderRadius: 12,
    backgroundColor: "var(--grey-700)",
    border: "none",
  };
  const tooltipTextStyle = { color: "white" };
  const axisTickProps = { fontSize: 10, fill: "var(--grey-400)" };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex rounded-[12px] p-1 bg-(--surface-150) self-start">
        {(["both", "spending", "savings"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "h-8 px-3 rounded-[10px] text-xs font-medium capitalize transition-colors",
              mode === m
                ? "bg-(--primary) text-white"
                : "text-(--grey-700) hover:bg-(--surface-200)"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--grey-200)" />
          <XAxis
            dataKey="month"
            tickFormatter={formatMonthLabel}
            tickLine={false}
            axisLine={false}
            tick={axisTickProps}
          />
          <YAxis tickLine={false} axisLine={false} tick={axisTickProps} width={40} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={tooltipTextStyle}
            itemStyle={tooltipTextStyle}
            formatter={(v: number) => [formatAmount(v), ""]}
            labelFormatter={formatMonthLabel}
            isAnimationActive={false}
          />

          {(mode === "spending" || mode === "both") && (
            <Bar
              dataKey="spending"
              fill="var(--primary)"
              name="Spending"
              radius={mode === "spending" ? [4, 4, 0, 0] : [2, 2, 0, 0]}
            />
          )}

          {mode === "savings" &&
            allCurrencies.map((currency, i) => (
              <Bar
                key={currency}
                dataKey={`savings_${currency}`}
                stackId="savings"
                fill={CURRENCY_COLORS[i % CURRENCY_COLORS.length]}
                name={currency}
                radius={i === allCurrencies.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}

          {mode === "both" && (
            <Bar
              dataKey="totalSavings"
              fill="var(--blue-400)"
              name="Savings"
              radius={[2, 2, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
