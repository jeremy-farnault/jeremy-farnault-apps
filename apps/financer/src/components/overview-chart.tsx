"use client";

import { CATEGORY_COLORS, SOURCE_COLORS } from "@/lib/constants";
import type { IncomeSourceRow, MonthlyTotals } from "@/lib/queries";
import { cn } from "@jf/ui";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function OverviewChart({
  data,
  sources,
}: { data: MonthlyTotals[]; sources: IncomeSourceRow[] }) {
  const [mode, setMode] = useState<"both" | "spending" | "savings">("both");

  const hasAnyData = data.some(
    (d) => d.spending > 0 || Object.values(d.savings).some((v) => v > 0)
  );
  if (!hasAnyData) return null;

  const allSources = Array.from(new Set(data.flatMap((d) => Object.keys(d.savings))));
  const allCategories = Array.from(new Set(data.flatMap((d) => Object.keys(d.spendingByCategory))));

  const chartData = data.map((d) => ({
    month: d.month,
    spending: d.spending,
    totalSavings: Object.values(d.savings).reduce((a, b) => a + b, 0),
    ...Object.fromEntries(allSources.map((s) => [`savings_${s}`, d.savings[s] ?? 0])),
    ...Object.fromEntries(
      allCategories.map((c) => [`spending_${c}`, d.spendingByCategory[c] ?? 0])
    ),
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
            formatter={(v: number, name: string) => [formatAmount(v), name]}
            labelFormatter={formatMonthLabel}
            isAnimationActive={false}
          />

          {(mode === "spending" || mode === "both") &&
            allCategories.map((category, i) => (
              <Bar
                key={category}
                dataKey={`spending_${category}`}
                stackId="spending"
                fill={CATEGORY_COLORS[category] ?? "var(--grey-400)"}
                name={category}
                radius={i === allCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}

          {mode === "savings" &&
            allSources.map((sourceName, i) => {
              const colorIndex = sources.findIndex((s) => s.name === sourceName);
              const color =
                SOURCE_COLORS[(colorIndex >= 0 ? colorIndex : i) % SOURCE_COLORS.length];
              return (
                <Bar
                  key={sourceName}
                  dataKey={`savings_${sourceName}`}
                  stackId="savings"
                  fill={color}
                  name={sourceName}
                  radius={i === allSources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}

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
