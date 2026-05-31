"use client";

import { INCOME_SOURCE_COLORS } from "@/lib/constants";
import type { IncomeRow } from "@/lib/queries";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function IncomeChart({ data }: { data: IncomeRow[] }) {
  if (data.length === 0) return null;

  const tooltipStyle = {
    fontSize: 11,
    borderRadius: 12,
    backgroundColor: "var(--grey-700)",
    border: "none",
  };
  const tooltipTextStyle = { color: "white" };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell
              key={`${entry.name}-${entry.currency}`}
              fill={INCOME_SOURCE_COLORS[index % INCOME_SOURCE_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: { payload?: IncomeRow }) => [
            formatAmount(value),
            `${name} · ${props.payload?.currency ?? ""}`,
          ]}
          contentStyle={tooltipStyle}
          labelStyle={tooltipTextStyle}
          itemStyle={tooltipTextStyle}
          isAnimationActive={false}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 11, color: "var(--grey-700)" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
