"use client";

import clsx from "clsx";
import { formatInr, type AnalystComposition } from "@/lib/parse-artifacts";

// Cohesive cool palette anchored on the violet/indigo brand, with cyan for
// liquidity and amber reserved only for literal gold. Reads as one family,
// not a rainbow.
const COLOR: Record<AnalystComposition["kind"], string> = {
  equity: "#8b5cf6",   // violet-500 (brand center)
  mf:     "#a78bfa",   // violet-400
  cash:   "#22d3ee",   // cyan-400 — liquidity
  fd:     "#6366f1",   // indigo-500
  gold:   "#fbbf24",   // amber-400 — literal gold
  bonds:  "#818cf8",   // indigo-400
  other:  "#a1a1aa",   // zinc-400
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

  const onlyFd =
    items.length === 1 && items[0].kind === "fd" && items[0].pct >= 99;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        Where your money is
      </h3>
      {onlyFd && (
        <p className="text-xs text-amber-300/80 mb-3 leading-relaxed">
          You're starting from 100% Fixed Deposit. No equity, mutual-fund, or
          debt-fund exposure yet — the Strategist will propose how to deploy
          this corpus.
        </p>
      )}
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
