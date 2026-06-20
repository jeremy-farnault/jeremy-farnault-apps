"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ExerciseProgressChartProps {
  data: { date: Date; maxWeight: number }[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

export function ExerciseProgressChart({ data }: ExerciseProgressChartProps) {
  const chartData = data.map((d) => ({
    dateStr: d.date.toISOString(),
    maxWeight: d.maxWeight,
  }));

  const interval = Math.max(0, Math.ceil(chartData.length / 6) - 1);

  const commonAxisProps = {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: 10, fill: "var(--grey-400)" },
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grey-200)" />
        <XAxis
          dataKey="dateStr"
          interval={interval}
          tickFormatter={formatDate}
          {...commonAxisProps}
        />
        <YAxis tickFormatter={(v) => `${v} kg`} {...commonAxisProps} />
        <Tooltip
          formatter={(value) => [`${value} kg`, "Max weight"]}
          labelFormatter={(label) => formatDate(label as string)}
          contentStyle={{
            fontSize: 11,
            borderRadius: 12,
            backgroundColor: "var(--grey-700)",
            border: "none",
          }}
          labelStyle={{ color: "white" }}
          itemStyle={{ color: "white" }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="maxWeight"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={
            chartData.length <= 30 ? { fill: "var(--primary)", stroke: "var(--primary)" } : false
          }
          activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--primary)" }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
