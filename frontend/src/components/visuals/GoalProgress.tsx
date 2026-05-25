"use client";

import clsx from "clsx";
import { Flag, Target } from "lucide-react";
import { formatInr, type UserPlanParsed } from "@/lib/parse-artifacts";

/**
 * Goal-progress card — shows where the user is on their corpus journey.
 * Lifted from user_plan.md (the analyst artifact doesn't carry goal target).
 */
export function GoalProgress({
  plan,
  currentCorpus,
}: {
  plan: UserPlanParsed;
  currentCorpus: number | null;
}) {
  const target = plan.goalAmount;
  const corpus = currentCorpus ?? plan.currentCorpus;
  if (target === null || target <= 0 || corpus === null) return null;

  const pct = Math.min(100, Math.max(0, (corpus / target) * 100));
  const remaining = Math.max(0, target - corpus);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Your goal
        </h3>
        {plan.goalType && (
          <span className="text-[11px] text-zinc-500">{plan.goalType}</span>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-semibold text-zinc-100 tabular-nums">
          {formatInr(corpus, { short: true })}
        </span>
        <span className="text-sm text-zinc-500 tabular-nums">
          / {formatInr(target, { short: true })}
        </span>
      </div>

      <div className="relative h-3 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
        <div
          className={clsx(
            "h-full transition-all",
            pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-teal-500" : "bg-zinc-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs mt-2.5">
        <span className="text-zinc-400">
          <Flag className="w-3 h-3 inline-block mr-1 text-zinc-500" />
          {plan.goalDate ?? "—"}
          {plan.horizonYears != null && (
            <span className="text-zinc-600 ml-1.5">
              ({plan.horizonYears < 2
                ? `${Math.round(plan.horizonYears * 12)} months`
                : `${plan.horizonYears.toFixed(plan.horizonYears % 1 === 0 ? 0 : 1)} years`}{" "}
              out)
            </span>
          )}
        </span>
        <span className="text-zinc-500 tabular-nums">
          {pct >= 100 ? (
            <span className="text-emerald-400 font-medium">
              ✓ Target met
            </span>
          ) : (
            <>
              {pct.toFixed(1)}% there ·{" "}
              <span className="text-zinc-300">
                {formatInr(remaining, { short: true })}
              </span>{" "}
              to go
            </>
          )}
        </span>
      </div>
    </div>
  );
}
