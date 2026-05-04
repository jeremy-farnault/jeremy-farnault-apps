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

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cur = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function prepareData(
  logs: HabitLog[],
  type: HabitType,
  from: string,
  to: string
): { date: string; value: number }[] {
  const map = new Map(
    logs
      .filter((l) => l.date >= from && l.date <= to)
      .map((l) => [
        l.date,
        type === "boolean" ? (l.value === "true" ? 1 : 0) : Number.parseFloat(l.value) || 0,
      ])
  );
  return eachDay(from, to).map((date) => ({
    date,
    value: map.get(date) ?? 0,
  }));
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

  const interval = Math.max(0, Math.ceil(data.length / 6) - 1);

  const commonAxisProps = {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: 10, fill: "var(--grey-400)" },
  };

  const commonMargin = { top: 4, right: 0, left: -28, bottom: 0 };

  const tooltipStyle = {
    fontSize: 11,
    zIndex: 50,
    borderRadius: 12,
    backgroundColor: "var(--grey-700)",
  };
  const tooltipTextStyle = { color: "white" };

  if (type === "boolean") {
    const rangeDays = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    const barSize = rangeDays > 180 ? 2 : rangeDays > 60 ? 4 : 8;

    return (
      <div style={{ color }} className="[&_svg]:!w-[95%]">
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
              labelStyle={tooltipTextStyle}
              itemStyle={tooltipTextStyle}
              isAnimationActive={false}
            />
            <Bar dataKey="value" fill="currentColor" radius={[3, 3, 0, 0]} barSize={barSize} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ color }} className="[&_svg]:!w-[95%]">
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
            labelStyle={tooltipTextStyle}
            itemStyle={tooltipTextStyle}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={data.length <= 60 ? { fill: color, stroke: color } : false}
            activeDot={{ r: 4, fill: color, stroke: color }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
