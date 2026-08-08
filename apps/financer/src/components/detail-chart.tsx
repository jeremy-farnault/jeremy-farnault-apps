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
  values: (number | null)[];
};

function formatMonthLabel(month: string): string {
  return new Date(`${month}-01`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAxisTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
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
  const items = payload.filter((p) => p.value != null);
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
            {item.name}: {formatAmount(item.value ?? 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function pickDefaultSelection(series: DetailSeries[]): Set<string> {
  if (!series.length) return new Set();
  // Most-recently-logged = greatest index of a logged (non-null) month; tiebreak by higher value.
  let bestName = series[0]?.name;
  let bestIdx = -1;
  let bestVal = Number.NEGATIVE_INFINITY;
  for (const s of series) {
    let lastIdx = -1;
    for (let i = s.values.length - 1; i >= 0; i--) {
      if (s.values[i] != null) {
        lastIdx = i;
        break;
      }
    }
    const latestVal = lastIdx >= 0 ? (s.values[lastIdx] as number) : -1;
    if (lastIdx > bestIdx || (lastIdx === bestIdx && latestVal > bestVal)) {
      bestName = s.name;
      bestIdx = lastIdx;
      bestVal = latestVal;
    }
  }
  return new Set(bestName ? [bestName] : []);
}

function computeStats(values: (number | null)[]): {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
} {
  const present = values.filter((v): v is number => v != null);
  if (!present.length) return { min: null, max: null, avg: null, latest: null };
  const min = Math.min(...present);
  const max = Math.max(...present);
  const avg = present.reduce((a, b) => a + b, 0) / present.length;
  let latest: number | null = null;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v != null) {
      latest = v;
      break;
    }
  }
  return { min, max, avg, latest };
}

function formatStat(value: number | null): string {
  return value == null ? "—" : formatAmount(value);
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
    const row: Record<string, string | number | null> = { month };
    series.forEach((s, si) => {
      row[`s${si}`] = s.values[i] ?? null;
    });
    return row;
  });

  const axisTickProps = { fontSize: 10, fill: "var(--grey-400)" };
  const selectedSeries = series.filter((s) => selected.has(s.name));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-(--grey-600)">{title}</h3>
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => setSelected(new Set(series.map((s) => s.name)))}
            className="text-(--grey-500) hover:text-(--grey-800) transition-colors"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-(--grey-500) hover:text-(--grey-800) transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

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
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={axisTickProps}
                width={52}
                tickFormatter={formatAxisTick}
              />
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
                    dot={{ r: 2 }}
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
                      <span className="text-(--grey-400)">Min</span> {formatStat(min)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Max</span> {formatStat(max)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Avg</span> {formatStat(avg)}
                    </span>
                    <span>
                      <span className="text-(--grey-400)">Latest</span> {formatStat(latest)}
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
