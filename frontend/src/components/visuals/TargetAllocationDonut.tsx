"use client";

import { formatInr, type TargetPosition } from "@/lib/parse-artifacts";

// Cohesive cool ramp in the violet/indigo/cyan brand family — ordered so
// adjacent slices stay distinct without resorting to a rainbow.
const PALETTE = [
  "#8b5cf6", "#22d3ee", "#6366f1", "#a78bfa", "#0ea5e9",
  "#818cf8", "#2dd4bf", "#c4b5fd", "#38bdf8", "#a1a1aa",
];

/**
 * Target allocation donut — answers Q1: "After my deployments, where will
 * my money sit?" Shows the Strategist's post-deployment composition.
 *
 * Sister of PortfolioDonut (which shows the current Analyst breakdown).
 * Render them side-by-side to see "today vs target".
 */
export function TargetAllocationDonut({
  positions,
}: {
  positions: TargetPosition[];
}) {
  if (positions.length === 0) return null;
  const total = positions.reduce((s, p) => s + p.amount, 0);
  if (total <= 0) return null;

  const R = 70, C = 90, STROKE = 22;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  const arcs = positions.map((p, i) => {
    const dash = (p.pct / 100) * circumference;
    const a = {
      ...p,
      color: PALETTE[i % PALETTE.length],
      strokeDasharray: `${dash} ${circumference - dash}`,
      strokeDashoffset: -offset,
    };
    offset += dash;
    return a;
  });

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
        Where your money will be after full deployment
      </h3>
      <div className="flex items-center gap-5">
        <svg width={180} height={180} viewBox="0 0 180 180" className="shrink-0">
          <circle cx={C} cy={C} r={R} fill="none" stroke="#27272a" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.symbol}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={a.strokeDasharray}
              strokeDashoffset={a.strokeDashoffset}
              transform={`rotate(-90 ${C} ${C})`}
            />
          ))}
          <text x={C} y={C - 4} textAnchor="middle" className="fill-zinc-400 text-[10px]">
            Target
          </text>
          <text x={C} y={C + 14} textAnchor="middle" className="fill-zinc-100 text-base font-semibold">
            {formatInr(total, { short: true })}
          </text>
        </svg>
        <ul className="flex-1 space-y-1.5 text-sm">
          {arcs.map((a) => (
            <li key={a.symbol} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
              <span className="text-zinc-300 flex-1 truncate" title={a.symbol}>
                {a.symbol.replace(/(?:\s+-\s+Direct\s+Growth)$/, "").slice(0, 28)}
              </span>
              <span className="text-zinc-100 text-xs font-medium tabular-nums">
                {formatInr(a.amount, { short: true })}
              </span>
              <span className="text-xs tabular-nums w-12 text-right text-zinc-500">
                {a.pct.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
