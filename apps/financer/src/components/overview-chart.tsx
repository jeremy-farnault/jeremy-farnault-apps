"use client";

import { ASSET_SOURCE_COLORS, CATEGORY_COLORS, INCOME_SOURCE_COLORS } from "@/lib/constants";
import type { AssetSourceRow, IncomeSourceRow, MonthlyTotals } from "@/lib/queries";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type TooltipItem = { name: string; value: number; color: string; dataKey: string };

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.name && p.value !== 0);
  if (!items.length) return null;

  return (
    <div
      style={{
        fontSize: 11,
        borderRadius: 12,
        backgroundColor: "var(--grey-700)",
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "white", margin: "0 0 4px 0" }}>{formatMonthLabel(label ?? "")}</p>
      {items.map((item) => (
        <div
          key={item.dataKey}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: item.color,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span>
            {item.name}: {formatAmount(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

const STACK_LABELS: Record<string, string> = {
  spending: "Spending",
  income: "Income",
  assets: "Savings",
};
const STACK_ORDER = ["income", "spending", "assets"];

function AllChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const groups: Record<string, { total: number; color: string }> = {};
  for (const item of payload) {
    const prefix = item.dataKey.split("_")[0];
    if (!prefix || item.value === 0) continue;
    if (!groups[prefix]) groups[prefix] = { total: 0, color: item.color };
    groups[prefix].total += item.value;
  }

  const entries = STACK_ORDER.flatMap((k) => {
    const g = groups[k];
    return g?.total ? [[k, g] as const] : [];
  });
  if (!entries.length) return null;

  return (
    <div
      style={{
        fontSize: 11,
        borderRadius: 12,
        backgroundColor: "var(--grey-700)",
        padding: "8px 12px",
      }}
    >
      <p style={{ color: "white", margin: "0 0 4px 0" }}>{formatMonthLabel(label ?? "")}</p>
      {entries.map(([prefix, { total, color }]) => (
        <div key={prefix} style={{ display: "flex", alignItems: "center", gap: 6, color: "white" }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: color,
              flexShrink: 0,
              display: "inline-block",
            }}
          />
          <span>
            {STACK_LABELS[prefix] ?? prefix}: {formatAmount(total)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OverviewChart({
  data,
  assetSources,
  incomeSources,
}: {
  data: MonthlyTotals[];
  assetSources: AssetSourceRow[];
  incomeSources: IncomeSourceRow[];
}) {
  const hasAnyData = data.some(
    (d) =>
      d.spending > 0 ||
      Object.values(d.assets).some((v) => v > 0) ||
      Object.values(d.income).some((v) => v > 0)
  );
  if (!hasAnyData) return null;

  const allAssetSources = Array.from(new Set(data.flatMap((d) => Object.keys(d.assets))));
  const allIncomeSources = Array.from(new Set(data.flatMap((d) => Object.keys(d.income))));
  const allCategories = Array.from(new Set(data.flatMap((d) => Object.keys(d.spendingByCategory))));

  const chartData = data.map((d) => ({
    month: d.month,
    spending: d.spending,
    totalAssets: Object.values(d.assets).reduce((a, b) => a + b, 0),
    totalIncome: Object.values(d.income).reduce((a, b) => a + b, 0),
    ...Object.fromEntries(allAssetSources.map((s) => [`assets_${s}`, d.assets[s] ?? 0])),
    ...Object.fromEntries(allIncomeSources.map((s) => [`income_${s}`, d.income[s] ?? 0])),
    ...Object.fromEntries(
      allCategories.map((c) => [`spending_${c}`, d.spendingByCategory[c] ?? 0])
    ),
  }));

  const axisTickProps = { fontSize: 10, fill: "var(--grey-400)" };

  return (
    <div className="flex flex-col gap-8">
      {/* Spending by category */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-(--grey-600)">Spending</h3>
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
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
            {allCategories.map((category, i) => (
              <Bar
                key={category}
                dataKey={`spending_${category}`}
                stackId="spending"
                fill={CATEGORY_COLORS[category] ?? "var(--grey-400)"}
                name={category}
                radius={i === allCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Income by source */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-(--grey-600)">Income</h3>
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
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
            {allIncomeSources.map((sourceName, i) => {
              const color =
                incomeSources.find((s) => s.name === sourceName)?.color ??
                INCOME_SOURCE_COLORS[i % INCOME_SOURCE_COLORS.length] ??
                "var(--grey-400)";
              return (
                <Bar
                  key={sourceName}
                  dataKey={`income_${sourceName}`}
                  stackId="income"
                  fill={color}
                  name={sourceName}
                  radius={i === allIncomeSources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Assets by source */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-(--grey-600)">Assets</h3>
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
            <Tooltip content={<ChartTooltip />} isAnimationActive={false} />
            {allAssetSources.map((sourceName, i) => {
              const color =
                assetSources.find((s) => s.name === sourceName)?.color ??
                ASSET_SOURCE_COLORS[i % ASSET_SOURCE_COLORS.length] ??
                "var(--grey-400)";
              return (
                <Bar
                  key={sourceName}
                  dataKey={`assets_${sourceName}`}
                  stackId="assets"
                  fill={color}
                  name={sourceName}
                  radius={i === allAssetSources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* All: spending + income + assets */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-(--grey-600)">All</h3>
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
            <Tooltip content={<AllChartTooltip />} isAnimationActive={false} />
            {allCategories.map((category, i) => (
              <Bar
                key={`all_spending_${category}`}
                dataKey={`spending_${category}`}
                stackId="spending"
                fill={CATEGORY_COLORS[category] ?? "var(--grey-400)"}
                name={category}
                radius={i === allCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
            {allIncomeSources.map((sourceName, i) => {
              const color =
                incomeSources.find((s) => s.name === sourceName)?.color ??
                INCOME_SOURCE_COLORS[i % INCOME_SOURCE_COLORS.length] ??
                "var(--grey-400)";
              return (
                <Bar
                  key={`all_income_${sourceName}`}
                  dataKey={`income_${sourceName}`}
                  stackId="income"
                  fill={color}
                  name={sourceName}
                  radius={i === allIncomeSources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
            {allAssetSources.map((sourceName, i) => {
              const color =
                assetSources.find((s) => s.name === sourceName)?.color ??
                ASSET_SOURCE_COLORS[i % ASSET_SOURCE_COLORS.length] ??
                "var(--grey-400)";
              return (
                <Bar
                  key={`all_assets_${sourceName}`}
                  dataKey={`assets_${sourceName}`}
                  stackId="assets"
                  fill={color}
                  name={sourceName}
                  radius={i === allAssetSources.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
