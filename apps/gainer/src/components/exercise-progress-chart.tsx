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

type ChartType = "weight" | "reps" | "duration" | "pace";

interface ExerciseProgressChartProps {
  data: { date: Date; value: number }[];
  chartType: ChartType;
  valueLabel: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

const formatters: Record<ChartType, (v: number) => string> = {
  weight: (v) => `${v} kg`,
  reps: (v) => String(v),
  duration: formatDuration,
  pace: formatPace,
};

export function ExerciseProgressChart({ data, chartType, valueLabel }: ExerciseProgressChartProps) {
  const formatValue = formatters[chartType];

  const chartData = data.map((d) => ({
    dateStr: d.date.toISOString(),
    value: d.value,
  }));

  const interval = Math.max(0, Math.ceil(chartData.length / 6) - 1);

  const commonAxisProps = {
    tickLine: false as const,
    axisLine: false as const,
    tick: { fontSize: 10, fill: "var(--grey-400)" },
  };

  return (
    <ResponsiveContainer width="95%" height={180}>
      <LineChart data={chartData} margin={{ top: 4, right: 24, left: -28, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--grey-200)" />
        <XAxis
          dataKey="dateStr"
          interval={interval}
          tickFormatter={formatDate}
          tickMargin={8}
          {...commonAxisProps}
        />
        <YAxis tickFormatter={formatValue} {...commonAxisProps} />
        <Tooltip
          formatter={(v) => [formatValue(v as number), valueLabel]}
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
          dataKey="value"
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
