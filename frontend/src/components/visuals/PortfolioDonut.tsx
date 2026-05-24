"use client";

import clsx from "clsx";
import { formatInr, type AnalystComposition } from "@/lib/parse-artifacts";

const COLOR: Record<AnalystComposition["kind"], string> = {
  equity: "#3b82f6",   // blue
  mf:     "#8b5cf6",   // violet
  cash:   "#10b981",   // emerald
  fd:     "#f59e0b",   // amber
  gold:   "#eab308",   // yellow
  bonds:  "#06b6d4",   // cyan
  other:  "#71717a",   // zinc
};

/**
 * Donut chart of portfolio composition (FD vs equity vs cash vs MF etc.).
 * Pure SVG — no chart library. Hides itself if there are no positions.
 */
export function PortfolioDonut({
  composition,
  total,
}: {
  composition: AnalystComposition[];
  total: number | null;
}) {
  if (composition.length === 0 || total === null || total <= 0) return null;

  const items = composition.map((c) => ({
    ...c,
    pct: (c.amount / total) * 100,
  }));

  // Build SVG arc paths. Donut: radius 70, stroke-width 22, center 90,90.
  const R = 70;
  const C = 90;
  const STROKE = 22;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const arcs = items.map((it) => {
    const dash = (it.pct / 100) * circumference;
    const arc = {
      ...it,
      strokeDasharray: `${dash} ${circumference - dash}`,
      strokeDashoffset: -offset,
    };
    offset += dash;
    return arc;
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        Where your money is
      </h3>
      <div className="flex items-center gap-5">
        <svg width={180} height={180} viewBox="0 0 180 180" className="shrink-0">
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="#27272a"
            strokeWidth={STROKE}
          />
          {arcs.map((a) => (
            <circle
              key={a.label}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={COLOR[a.kind]}
              strokeWidth={STROKE}
              strokeDasharray={a.strokeDasharray}
              strokeDashoffset={a.strokeDashoffset}
              transform={`rotate(-90 ${C} ${C})`}
            />
          ))}
          <text
            x={C}
            y={C - 4}
            textAnchor="middle"
            className="fill-zinc-400 text-[10px]"
          >
            Total
          </text>
          <text
            x={C}
            y={C + 14}
            textAnchor="middle"
            className="fill-zinc-100 text-base font-semibold"
          >
            {formatInr(total, { short: true })}
          </text>
        </svg>
        <ul className="flex-1 space-y-1.5 text-sm">
          {items.map((it) => (
            <li key={it.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: COLOR[it.kind] }}
              />
              <span className="text-zinc-300 flex-1 truncate">{it.label}</span>
              <span className="text-zinc-100 font-medium tabular-nums">
                {formatInr(it.amount, { short: true })}
              </span>
              <span
                className={clsx(
                  "text-xs tabular-nums w-12 text-right",
                  it.pct >= 50 ? "text-amber-400" : "text-zinc-500",
                )}
              >
                {it.pct.toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
