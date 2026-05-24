/**
 * Milestone projections — pure client-side math so the dashboard can show
 * "where you should be in N years" without waiting on the Strategist.
 *
 * The Strategist's actual proposal is the source of truth for THIS month's
 * action; these projections are just the long-horizon scaffold to show
 * the user the journey, not the next-90-days tactical plan.
 */

import { parseUserPlan, type UserPlanParsed } from "./parse-artifacts";

export type RiskTolerance = "low" | "medium" | "high" | "unknown";

/**
 * Conservative-ish blended-return assumptions for Indian retail investors.
 * These are NOT promises — they're the kind of "rule-of-thumb" numbers a
 * planner uses to draw a glide path. Real returns vary.
 */
export const ASSUMED_RETURN: Record<Exclude<RiskTolerance, "unknown">, number> = {
  low: 8,    // 50% equity / 50% debt blend
  medium: 10, // 70% equity / 30% debt blend
  high: 12,   // 90% equity / 10% debt blend
};

/** Equity glide-path target at each year — start aggressive, de-risk toward goal. */
export function equityAllocationPct(
  yearsFromNow: number,
  yearsToGoal: number,
  risk: RiskTolerance,
): number {
  // Risk-aware peak equity allocation.
  const peakEquity = { low: 50, medium: 70, high: 85, unknown: 60 }[risk];
  // De-risk in the final 30% of the journey (or last 3 years, whichever is more)
  const deriskWindow = Math.max(3, yearsToGoal * 0.3);
  const yearsToGoalFromNow = Math.max(0, yearsToGoal - yearsFromNow);
  if (yearsToGoalFromNow >= deriskWindow) return peakEquity;
  // Linear de-risk from peak down to 20% by goal year
  const t = 1 - yearsToGoalFromNow / deriskWindow;
  return Math.round(peakEquity - t * (peakEquity - 20));
}

export function parseRiskTolerance(planText: string | undefined | null): RiskTolerance {
  if (!planText) return "unknown";
  const m = planText.match(/Tolerance:\s*([^\n]+)/i);
  if (!m) return "unknown";
  const t = m[1].toLowerCase();
  if (t.includes("low")) return "low";
  if (t.includes("medium") || t.includes("moderate")) return "medium";
  if (t.includes("high")) return "high";
  return "unknown";
}

export type Milestone = {
  year: number;            // calendar year (e.g. 2027)
  yearsFromNow: number;    // 0 = this year
  projectedCorpus: number;
  equityPct: number;
  debtPct: number;
  /** "milestone" / "goal" / "now" — for rendering emphasis */
  kind: "now" | "milestone" | "goal";
};

/**
 * Project corpus over time using compound interest on the current corpus
 * plus monthly contributions. Year-end snapshots, not daily.
 */
export function projectMilestones({
  startingCorpus,
  monthlyContribution,
  yearsToGoal,
  risk,
  goalAmount,
}: {
  startingCorpus: number;
  monthlyContribution: number;
  yearsToGoal: number;
  risk: RiskTolerance;
  goalAmount: number | null;
}): Milestone[] {
  const annualReturn = risk === "unknown" ? 9 : ASSUMED_RETURN[risk];
  const monthlyReturn = annualReturn / 100 / 12;
  const thisYear = new Date().getFullYear();

  // Determine which year-offsets to surface — adapt to horizon length.
  const offsets = pickMilestoneOffsets(yearsToGoal);

  const milestones: Milestone[] = [];
  let corpus = startingCorpus;

  // Always include "now" at offset 0
  milestones.push({
    year: thisYear,
    yearsFromNow: 0,
    projectedCorpus: startingCorpus,
    equityPct: equityAllocationPct(0, yearsToGoal, risk),
    debtPct: 100 - equityAllocationPct(0, yearsToGoal, risk),
    kind: "now",
  });

  for (let y = 1; y <= yearsToGoal; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = corpus * (1 + monthlyReturn) + monthlyContribution;
    }
    if (offsets.includes(y)) {
      milestones.push({
        year: thisYear + y,
        yearsFromNow: y,
        projectedCorpus: corpus,
        equityPct: equityAllocationPct(y, yearsToGoal, risk),
        debtPct: 100 - equityAllocationPct(y, yearsToGoal, risk),
        kind: y === yearsToGoal ? "goal" : "milestone",
      });
    }
  }

  // Annotate "goal met" — if projected corpus passes goalAmount before the
  // user's stated goal year, the path is comfortably on track.
  if (goalAmount !== null) {
    for (const m of milestones) {
      if (m.kind !== "now" && m.projectedCorpus >= goalAmount && m.kind !== "goal") {
        // No flag for now; the UI can derive this comparatively.
      }
    }
  }

  return milestones;
}

function pickMilestoneOffsets(yearsToGoal: number): number[] {
  // Short horizon (≤ 3 yrs): every year
  if (yearsToGoal <= 3) return Array.from({ length: yearsToGoal }, (_, i) => i + 1);
  // Medium horizon (4-7 yrs): every year for first 3, then goal year
  if (yearsToGoal <= 7) return [1, 2, 3, yearsToGoal].filter((v, i, a) => a.indexOf(v) === i);
  // Longer horizon: 1, 3, 5, 10, then goal
  if (yearsToGoal <= 15)
    return [1, 3, 5, 10, yearsToGoal].filter((v, i, a) => v <= yearsToGoal && a.indexOf(v) === i);
  // Very long horizon (retirement): 1, 5, 10, 20, half-way, then goal
  return [
    1,
    5,
    10,
    20,
    Math.floor(yearsToGoal / 2),
    yearsToGoal,
  ]
    .filter((v) => v > 0 && v <= yearsToGoal)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);
}

/**
 * Derive a complete milestone projection from a user_plan.md content string.
 * Returns null if user_plan is missing required fields.
 */
export function projectFromUserPlan(
  planText: string,
): { plan: UserPlanParsed; risk: RiskTolerance; milestones: Milestone[] } | null {
  const plan = parseUserPlan(planText);
  if (
    plan.goalAmount === null ||
    plan.currentCorpus === null ||
    plan.monthlyInvestable === null ||
    plan.horizonYears === null
  ) {
    return null;
  }
  const risk = parseRiskTolerance(planText);
  const milestones = projectMilestones({
    startingCorpus: plan.currentCorpus,
    monthlyContribution: plan.monthlyInvestable,
    yearsToGoal: plan.horizonYears,
    risk,
    goalAmount: plan.goalAmount,
  });
  return { plan, risk, milestones };
}
