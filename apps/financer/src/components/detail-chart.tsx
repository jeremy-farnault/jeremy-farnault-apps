"use client";

import { cn } from "@jf/ui";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DetailSeries = {
  name: string;
  color: string;
  values: number[];
};

function formatMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type TooltipItem = { name?: string; value?: number; color?: string; dataKey?: string };

function DetailTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

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
      {payload.map((item) => (
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
            {item.name}: {formatAmount(item.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function pickDefaultSelection(series: DetailSeries[]): Set<string> {
  if (!series.length) return new Set();
  // Most-recently-logged = greatest index of a non-zero month; tiebreak by higher value there.
  let bestName = series[0]?.name;
  let bestIdx = -1;
  let bestVal = Number.NEGATIVE_INFINITY;
  for (const s of series) {
    let lastIdx = -1;
    for (let i = s.values.length - 1; i >= 0; i--) {
      if ((s.values[i] ?? 0) > 0) {
        lastIdx = i;
        break;
      }
    }
    const latestVal = lastIdx >= 0 ? (s.values[lastIdx] ?? 0) : -1;
    if (lastIdx > bestIdx || (lastIdx === bestIdx && latestVal > bestVal)) {
      bestName = s.name;
      bestIdx = lastIdx;
      bestVal = latestVal;
    }
  }
  return new Set(bestName ? [bestName] : []);
}

function computeStats(values: number[]): { min: number; max: number; avg: number; latest: number } {
  const nonZero = values.filter((v) => v > 0);
  const min = nonZero.length ? Math.min(...nonZero) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const avg = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const latest = values.length ? (values[values.length - 1] ?? 0) : 0;
  return { min, max, avg, latest };
}

export function DetailChart({
  title,
  months,
  series,
}: {
  title: string;
  months: string[];
  series: DetailSeries[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => pickDefaultSelection(series));

  if (!series.length) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-(--grey-600)">{title}</h3>
        <p className="text-sm text-(--grey-400)">No data yet.</p>
      </div>
    );
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const rows = months.map((month, i) => {
    const row: Record<string, string | number> = { month };
    series.forEach((s, si) => {
      row[`s${si}`] = s.values[i] ?? 0;
    });
    return row;
  });

  const axisTickProps = { fontSize: 10, fill: "var(--grey-400)" };
  const selectedSeries = series.filter((s) => selected.has(s.name));

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-(--grey-600)">{title}</h3>

      {/* Toggle chips */}
      <div className="flex flex-wrap gap-2">
        {series.map((s) => {
          const active = selected.has(s.name);
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              className={cn(
                "flex items-center gap-2 h-8 px-3 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "border-(--grey-300) bg-(--surface-200) text-(--grey-800)"
                  : "border-transparent bg-(--surface-150) text-(--grey-400) hover:text-(--grey-600)"
              )}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: s.color,
                  opacity: active ? 1 : 0.4,
                }}
              />
              {s.name}
            </button>
          );
        })}
      </div>

      {selectedSeries.length === 0 ? (
        <p className="text-sm text-(--grey-400)">Select an item to see its trend.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                content={<DetailTooltip />}
                isAnimationActive={false}
                wrapperStyle={{ zIndex: 100 }}
              />
              {series.map((s, si) =>
                selected.has(s.name) ? (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={`s${si}`}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>

          {/* Per-item stats: Min / Max / Avg / Latest */}
          <div className="flex flex-col gap-2">
            {selectedSeries.map((s) => {
              const { min, max, avg, latest } = computeStats(s.values);
              return (
                <div
                  key={s.name}
                  className="flex flex-col gap-1 rounded-[12px] bg-(--surface-150) px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-(--grey-800)">
                    <span
                      className="inline-block rounded-full"
                      style={{ width: 8, height: 8, backgroundColor: s.color }}
                    />
                    {s.name}
                  </div>
                  <div className="flex gap-4 text-xs text-(--grey-600)">
                    <span>
                      <span className="text-(--grey-400)">Min</span> {formatAmount(min)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Max</span> {formatAmount(max)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Avg</span> {formatAmount(avg)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Latest</span> {formatAmount(latest)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
