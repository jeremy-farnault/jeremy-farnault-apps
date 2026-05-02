"use client";

import type { HabitLog } from "@/lib/queries";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type HabitType = "boolean" | "numeric" | "time";

interface HabitChartProps {
  logs: HabitLog[];
  type: HabitType;
  color: string;
  from: string;
  to: string;
}

function formatXTick(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function prepareData(
  logs: HabitLog[],
  type: HabitType,
  from: string,
  to: string
): { date: string; value: number }[] {
  return logs
    .filter((l) => l.date >= from && l.date <= to)
    .map((l) => ({
      date: l.date,
      value: type === "boolean" ? (l.value === "true" ? 1 : 0) : Number.parseFloat(l.value) || 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function HabitChart({ logs, type, color, from, to }: HabitChartProps) {
  const data = prepareData(logs, type, from, to);

  if (data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-(--grey-400)">
        No data for this period
      </div>
    );
  }

  const interval = Math.max(0, Math.floor(data.length / 8) - 1);

  const commonAxisProps = {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: 10, fill: "var(--grey-400)" },
  };

  const commonMargin = { top: 4, right: 0, left: -28, bottom: 0 };

  const tooltipStyle = { fontSize: 11, zIndex: 50 };

  if (type === "boolean") {
    const rangeDays = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    const barSize = rangeDays > 180 ? 2 : rangeDays > 60 ? 4 : 8;

    return (
      <div style={{ color }}>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={data} margin={commonMargin}>
            <CartesianGrid vertical={false} stroke="var(--grey-200)" />
            <XAxis
              dataKey="date"
              interval={interval}
              tickFormatter={formatXTick}
              {...commonAxisProps}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 1]}
              tickFormatter={(v) => (v === 1 ? "Done" : "")}
              {...commonAxisProps}
            />
            <Tooltip
              formatter={(value) => [value === 1 ? "Done" : "Not done", ""]}
              labelFormatter={(label) => formatXTick(label as string)}
              contentStyle={tooltipStyle}
              isAnimationActive={false}
            />
            <Bar dataKey="value" fill="currentColor" radius={[3, 3, 0, 0]} barSize={barSize} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ color }}>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={commonMargin}>
          <CartesianGrid vertical={false} stroke="var(--grey-200)" />
          <XAxis
            dataKey="date"
            interval={interval}
            tickFormatter={formatXTick}
            {...commonAxisProps}
          />
          <YAxis
            tickFormatter={(v) => (type === "time" ? `${v}m` : String(v))}
            {...commonAxisProps}
          />
          <Tooltip
            formatter={(value) => [
              type === "time" ? `${value}m` : value,
              type === "time" ? "Duration" : "Value",
            ]}
            labelFormatter={(label) => formatXTick(label as string)}
            contentStyle={tooltipStyle}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="currentColor"
            strokeWidth={2}
            dot={data.length <= 60 ? { fill: "currentColor", stroke: "currentColor" } : false}
            activeDot={{ r: 4, fill: "currentColor", stroke: "currentColor" }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
