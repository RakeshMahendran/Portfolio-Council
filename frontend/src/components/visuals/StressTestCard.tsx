"use client";

import clsx from "clsx";
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { type StressScenario } from "@/lib/parse-artifacts";

const VERDICT_UI = {
  ACCEPTABLE: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-950/30", border: "border-emerald-800/40" },
  MARGINAL:   { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-950/30", border: "border-amber-800/40" },
  UNACCEPTABLE: { icon: XCircle, color: "text-red-400", bg: "bg-red-950/30", border: "border-red-800/50" },
} as const;

/**
 * Stress-test scenarios card — answers Q2: "What if markets crash?"
 * Renders each Strategist-defined scenario (2008-style crash, 2020 shock, etc.)
 * with drawdown %, recovery time, and verdict.
 */
export function StressTestCard({ scenarios }: { scenarios: StressScenario[] }) {
  if (scenarios.length === 0) return null;
  // Drawdowns are stored signed (e.g. -8.85). The worst case is the largest
  // magnitude; display it as a positive number.
  const magnitudes = scenarios
    .filter((s) => s.drawdownPct !== null)
    .map((s) => Math.abs(s.drawdownPct as number));
  const worst = magnitudes.length > 0 ? Math.max(...magnitudes) : NaN;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          What if markets crash? (Stress test)
        </h3>
        {isFinite(worst) && (
          <span className="text-xs text-zinc-400">
            Worst case: <span className="text-red-300 font-semibold tabular-nums">{worst.toFixed(1)}%</span>
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {scenarios.map((s, i) => {
          const ui = s.verdict ? VERDICT_UI[s.verdict] : VERDICT_UI.MARGINAL;
          const Icon = ui.icon;
          return (
            <li
              key={i}
              className={clsx("flex items-start gap-3 p-3 rounded-lg border", ui.bg, ui.border)}
            >
              <Icon className={clsx("w-4 h-4 mt-0.5 shrink-0", ui.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-100 mb-1">
                  {s.name.replace(/Scenario\s+\d+:\s*/, "")}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                  {s.drawdownPct !== null && (
                    <span>
                      Drawdown:{" "}
                      <span className="text-red-300 font-medium tabular-nums">
                        {Math.abs(s.drawdownPct).toFixed(1)}%
                      </span>
                    </span>
                  )}
                  {s.recovery && (
                    <span>
                      Recovery: <span className="text-zinc-200">{s.recovery}</span>
                    </span>
                  )}
                </div>
              </div>
              {s.verdict && (
                <span className={clsx("text-[10px] uppercase tracking-wider font-medium shrink-0", ui.color)}>
                  {s.verdict}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
