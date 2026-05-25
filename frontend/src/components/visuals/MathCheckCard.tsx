"use client";

import { Calculator } from "lucide-react";
import { formatInr, type MathCheck } from "@/lib/parse-artifacts";

/**
 * Math reconciliation — answers Q5: "How does the math add up?"
 * Surfaces the Strategist's own arithmetic chain: monthly × months →
 * total contributions × return → projected corpus vs goal.
 */
export function MathCheckCard({ math }: { math: MathCheck }) {
  // Hide if we have nothing useful
  const hasAnything =
    math.monthlyContribution !== null ||
    math.assumedReturnPct !== null ||
    math.projectedCorpus !== null;
  if (!hasAnything) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-1.5">
        <Calculator className="w-3.5 h-3.5" />
        Math check — does the plan actually reach the goal?
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {math.monthlyContribution !== null && (
          <Stat label="Monthly SIP" value={formatInr(math.monthlyContribution, { short: true })} />
        )}
        {math.months !== null && (
          <Stat label="Over" value={`${math.months} months`} />
        )}
        {math.assumedReturnPct !== null && (
          <Stat label="Assumed return" value={`${math.assumedReturnPct}%`} suffix="annual" />
        )}
        {math.goalAmount !== null && (
          <Stat label="Goal" value={formatInr(math.goalAmount, { short: true })} />
        )}
      </div>

      {math.totalContributions !== null && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/40 border border-zinc-800 text-sm">
          <span className="text-zinc-400">
            Total contributions over period
          </span>
          <span className="font-semibold text-zinc-100 tabular-nums">
            {formatInr(math.totalContributions, { short: true })}
          </span>
        </div>
      )}

      {math.projectedCorpus !== null && math.goalAmount !== null && math.goalCoveragePct !== null && (
        <div className="mt-3 p-3 rounded-lg border-2 border-emerald-700/40 bg-emerald-950/20 text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-emerald-200 font-medium">
              At assumed return, projected corpus:
            </span>
            <span className="text-emerald-100 font-bold text-lg tabular-nums">
              {formatInr(math.projectedCorpus, { short: true })}
            </span>
          </div>
          <p className="text-xs text-emerald-200/80">
            {math.goalCoveragePct >= 100
              ? `${math.goalCoveragePct.toFixed(0)}% of your ${formatInr(math.goalAmount, { short: true })} goal — comfortably on track.`
              : `Only ${math.goalCoveragePct.toFixed(0)}% of your ${formatInr(math.goalAmount, { short: true })} goal — would need higher SIP / return / horizon to close the gap.`}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</div>
      <div className="text-base font-semibold text-zinc-100 tabular-nums">{value}</div>
      {suffix && <div className="text-[10px] text-zinc-500">{suffix}</div>}
    </div>
  );
}
