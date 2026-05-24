"use client";

import clsx from "clsx";
import { TrendingUp, Flag, MapPin } from "lucide-react";
import {
  projectFromUserPlan,
  type Milestone,
  type RiskTolerance,
  ASSUMED_RETURN,
} from "@/lib/milestones";
import { formatInr, type UserPlanParsed } from "@/lib/parse-artifacts";

/**
 * Milestone projection table — answers "where should I be in N years?"
 *
 * Computed client-side from user_plan.md using compound interest +
 * risk-derived assumed return. Shows the de-risking glide path explicitly.
 * Not a guarantee — these are the kind of projections a planner uses to
 * give the user a sense of trajectory.
 */
export function MilestoneTable({ planText }: { planText: string | null }) {
  if (!planText) return null;
  const result = projectFromUserPlan(planText);
  if (!result) return null;
  return <MilestoneTableContent {...result} />;
}

function MilestoneTableContent({
  plan,
  risk,
  milestones,
}: {
  plan: UserPlanParsed;
  risk: RiskTolerance;
  milestones: Milestone[];
}) {
  const finalCorpus = milestones[milestones.length - 1]?.projectedCorpus ?? 0;
  const goalAmount = plan.goalAmount ?? 0;
  const onTrack = goalAmount > 0 && finalCorpus >= goalAmount;
  const multiplier = goalAmount > 0 ? finalCorpus / goalAmount : 0;
  const assumedReturn =
    risk === "unknown" ? 9 : ASSUMED_RETURN[risk];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-zinc-100">
            Your milestones — where you should be
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500">
          Assumed {assumedReturn}% annual return (
          <span className="capitalize">{risk}</span> risk)
        </span>
      </div>

      {/* Horizontal milestone strip */}
      <div className="relative pb-6">
        <div className="absolute left-3 right-3 top-1/2 h-px bg-zinc-800 -translate-y-1/2" />
        <div className="relative flex justify-between items-center">
          {milestones.map((m) => (
            <MilestoneDot
              key={m.year}
              milestone={m}
              isGoalMet={
                goalAmount > 0 && m.projectedCorpus >= goalAmount
              }
            />
          ))}
        </div>
      </div>

      {/* Detail table */}
      <div className="mt-2 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60 text-zinc-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Year</th>
              <th className="text-right px-3 py-2 font-medium">Projected corpus</th>
              <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">
                Allocation
              </th>
              <th className="text-left px-3 py-2 font-medium hidden md:table-cell">
                Where you should be
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {milestones.map((m) => (
              <tr
                key={m.year}
                className={clsx(
                  m.kind === "now" && "bg-blue-950/20",
                  m.kind === "goal" && "bg-emerald-950/20",
                )}
              >
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    {m.kind === "now" && (
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    )}
                    {m.kind === "goal" && (
                      <Flag className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span
                      className={clsx(
                        "font-medium tabular-nums",
                        m.kind === "now" && "text-blue-300",
                        m.kind === "goal" && "text-emerald-300",
                        m.kind === "milestone" && "text-zinc-200",
                      )}
                    >
                      {m.year}
                    </span>
                    {m.yearsFromNow > 0 && (
                      <span className="text-[10px] text-zinc-500 tabular-nums">
                        +{m.yearsFromNow}y
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <span
                    className={clsx(
                      "font-semibold",
                      m.kind === "now"
                        ? "text-blue-200"
                        : m.kind === "goal"
                          ? "text-emerald-200"
                          : "text-zinc-100",
                    )}
                  >
                    {formatInr(m.projectedCorpus, { short: true })}
                  </span>
                  {goalAmount > 0 && m.kind !== "now" && (
                    <span
                      className={clsx(
                        "block text-[10px] tabular-nums",
                        m.projectedCorpus >= goalAmount
                          ? "text-emerald-500"
                          : "text-zinc-500",
                      )}
                    >
                      {((m.projectedCorpus / goalAmount) * 100).toFixed(0)}%
                      of goal
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 hidden sm:table-cell">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="flex h-1.5 w-20 rounded-sm overflow-hidden bg-zinc-800">
                      <div
                        className="bg-blue-500"
                        style={{ width: `${m.equityPct}%` }}
                        title={`${m.equityPct}% equity`}
                      />
                      <div
                        className="bg-amber-500"
                        style={{ width: `${m.debtPct}%` }}
                        title={`${m.debtPct}% debt`}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-500 tabular-nums w-12 text-right">
                      {m.equityPct}/{m.debtPct}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-xs text-zinc-500">
                  {milestoneNarrative(m, plan, risk, goalAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom summary */}
      <div
        className={clsx(
          "mt-4 rounded-lg p-3 text-sm",
          onTrack
            ? "bg-emerald-950/30 border border-emerald-800/40 text-emerald-200"
            : "bg-amber-950/30 border border-amber-800/40 text-amber-200",
        )}
      >
        {onTrack ? (
          <>
            ✓ At this pace your projected corpus reaches{" "}
            <span className="font-semibold">
              {formatInr(finalCorpus, { short: true })}
            </span>{" "}
            by goal year —{" "}
            <span className="font-semibold">
              {multiplier.toFixed(1)}× your target
            </span>{" "}
            of {formatInr(goalAmount, { short: true })}. You're not at risk
            of missing the goal; the question is how to optimise.
          </>
        ) : (
          <>
            ⚠ At this pace you'd reach {formatInr(finalCorpus, { short: true })}{" "}
            — short of your{" "}
            <span className="font-semibold">
              {formatInr(goalAmount, { short: true })}
            </span>{" "}
            target. Council will propose ways to close the gap.
          </>
        )}
      </div>

      <p className="mt-3 text-[10px] text-zinc-600 italic">
        Projections compound monthly contributions at the assumed annual
        return. Real returns vary — actual outcomes depend on market path,
        rule-following discipline, and re-investments. Use as a trajectory,
        not a guarantee.
      </p>
    </div>
  );
}

function MilestoneDot({
  milestone,
  isGoalMet,
}: {
  milestone: Milestone;
  isGoalMet: boolean;
}) {
  const isNow = milestone.kind === "now";
  const isGoal = milestone.kind === "goal";
  return (
    <div className="flex flex-col items-center">
      <div
        className={clsx(
          "rounded-full border-2 z-10 mb-1",
          isNow
            ? "w-3.5 h-3.5 bg-blue-500 border-blue-300 shadow-lg shadow-blue-500/50"
            : isGoal
              ? "w-3.5 h-3.5 bg-emerald-500 border-emerald-300 shadow-lg shadow-emerald-500/50"
              : isGoalMet
                ? "w-2.5 h-2.5 bg-emerald-600 border-emerald-400"
                : "w-2.5 h-2.5 bg-zinc-700 border-zinc-500",
        )}
      />
      <div className="absolute top-6 text-[10px] text-zinc-500 tabular-nums">
        {milestone.year}
      </div>
    </div>
  );
}

function milestoneNarrative(
  m: Milestone,
  plan: UserPlanParsed,
  _risk: RiskTolerance,
  goalAmount: number,
): string {
  if (m.kind === "now") return "Starting point";
  if (m.kind === "goal") {
    return goalAmount > 0 && m.projectedCorpus >= goalAmount
      ? "Goal year — on track"
      : "Goal year";
  }
  // For early milestones, narrate where the corpus stands relative to goal
  if (goalAmount > 0) {
    const pct = (m.projectedCorpus / goalAmount) * 100;
    if (pct >= 100) return "Goal already reached — extra growth from here";
    if (pct >= 50) return "Past the halfway point";
    if (pct >= 25) return "Quarter of the way";
    return "Still early — compounding does the heavy lifting later";
  }
  return "";
}
