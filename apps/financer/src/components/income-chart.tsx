"use client";

import { INCOME_SOURCE_COLORS } from "@/lib/constants";
import type { IncomeRow, IncomeSourceRow } from "@/lib/queries";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function IncomeChart({
  data,
  sources,
}: {
  data: IncomeRow[];
  sources?: IncomeSourceRow[];
}) {
  if (data.length === 0) return null;

  const tooltipStyle = {
    fontSize: 11,
    borderRadius: 12,
    backgroundColor: "var(--grey-700)",
    border: "none",
  };
  const tooltipTextStyle = { color: "white" };

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            strokeWidth={0}
          >
            {data.map((entry, index) => {
              const color =
                sources?.find((s) => s.name === entry.name)?.color ??
                INCOME_SOURCE_COLORS[index % INCOME_SOURCE_COLORS.length] ??
                "var(--grey-400)";
              return <Cell key={entry.name} fill={color} />;
            })}
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
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 px-2 mt-2">
        {data.map((entry, index) => {
          const color =
            sources?.find((s) => s.name === entry.name)?.color ??
            INCOME_SOURCE_COLORS[index % INCOME_SOURCE_COLORS.length] ??
            "var(--grey-400)";
          return (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[11px]" style={{ color: "var(--grey-700)" }}>
                {entry.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
