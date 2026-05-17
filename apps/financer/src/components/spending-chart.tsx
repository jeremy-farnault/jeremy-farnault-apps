"use client";

import type { SpendingRow } from "@/lib/queries";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  Entertainment: "var(--purple-400)",
  Everyday: "var(--blue-400)",
  Groceries: "var(--green-400)",
  Health: "var(--teal-400)",
  Housing: "var(--moss-400)",
  "Presents & Hobbies": "var(--magenta-400)",
  Restaurant: "var(--yellow-400)",
  Transport: "var(--taupe-400)",
  Other: "var(--beige-400)",
};

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SpendingChart({ data }: { data: SpendingRow[] }) {
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
          nameKey="category"
          cx="50%"
          cy="45%"
          outerRadius={90}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category] ?? "var(--grey-400)"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatAmount(value), ""]}
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
