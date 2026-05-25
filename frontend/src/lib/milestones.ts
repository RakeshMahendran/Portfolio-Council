/**
 * Milestone projections — pure client-side math so the dashboard can show
 * "what must I save, and where will I be" without waiting on the Strategist.
 *
 * Month-based so it works for BOTH a 13-month house goal and a 30-year
 * retirement. The Strategist's proposal is the source of truth for THIS
 * month's action; these projections are the trajectory scaffold.
 */

import { parseUserPlan, type UserPlanParsed } from "./parse-artifacts";

export type RiskTolerance = "low" | "medium" | "high" | "unknown";

/**
 * Conservative-ish blended-return assumptions for Indian retail investors.
 * NOT promises — rule-of-thumb numbers a planner uses to draw a glide path.
 */
export const ASSUMED_RETURN: Record<Exclude<RiskTolerance, "unknown">, number> = {
  low: 8,
  medium: 10,
  high: 12,
};

export function parseRiskTolerance(
  planText: string | undefined | null,
): RiskTolerance {
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
  label: string; // "Now", "Aug 2026", "Jun 2027"
  monthsFromNow: number;
  projectedCorpus: number;
  equityPct: number;
  debtPct: number;
  kind: "now" | "milestone" | "goal";
};

export type MilestoneProjection = {
  plan: UserPlanParsed;
  risk: RiskTolerance;
  assumedReturn: number; // % annual
  monthsToGoal: number;
  milestones: Milestone[];
  projectedFinal: number; // corpus at goal date, at the planned pace
  plannedMonthly: number;
  requiredMonthly: number; // monthly contribution needed to exactly hit goal
  requiredReturn: number | null; // annual % the corpus must earn (0 = none needed, null = unreachable)
  goalAmount: number;
  onTrack: boolean;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Months from today until a target date string ("June 2027" / "2027-06" / "2055"). */
export function monthsUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  let target: Date | null = null;

  const iso = dateStr.match(/(\d{4})-(\d{1,2})/); // 2027-06
  const monthName = dateStr.match(
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
  );
  const yearOnly = dateStr.match(/\b(20\d{2})\b/);

  if (iso) {
    target = new Date(Number(iso[1]), Number(iso[2]) - 1, 1);
  } else if (monthName) {
    const idx = MONTHS.findIndex(
      (m) => m.toLowerCase() === monthName[1].slice(0, 3).toLowerCase(),
    );
    target = new Date(Number(monthName[2]), idx, 1);
  } else if (yearOnly) {
    target = new Date(Number(yearOnly[1]), 11, 31); // year-end
  }
  if (!target) return null;

  const now = new Date();
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

/** Equity glide-path %: hold peak, then de-risk over the final stretch toward goal. */
function equityPctAtMonth(
  monthsFromNow: number,
  monthsToGoal: number,
  risk: RiskTolerance,
): number {
  const peak = { low: 50, medium: 70, high: 85, unknown: 60 }[risk];
  const deriskWindow = Math.max(6, monthsToGoal * 0.3); // last 30% or 6 months
  const remaining = Math.max(0, monthsToGoal - monthsFromNow);
  if (remaining >= deriskWindow) return peak;
  const t = 1 - remaining / deriskWindow;
  return Math.round(peak - t * (peak - 15)); // glide down to ~15% by goal
}

/** Pick up to ~4–6 evenly spaced month offsets, always including the goal month. */
function pickMonthOffsets(months: number): number[] {
  if (months <= 1) return [months];
  const n = months <= 24 ? 4 : 6;
  const pts = new Set<number>();
  for (let i = 1; i <= n; i++) pts.add(Math.round((months * i) / n));
  pts.add(months);
  return [...pts].filter((x) => x >= 1).sort((a, b) => a - b);
}

/** Monthly contribution needed so current corpus + annuity compounds to goal. */
function requiredMonthlyContribution(
  goal: number,
  current: number,
  months: number,
  monthlyReturn: number,
): number {
  const growth = Math.pow(1 + monthlyReturn, months);
  const fvCurrent = current * growth;
  const annuityFactor = monthlyReturn === 0 ? months : (growth - 1) / monthlyReturn;
  if (annuityFactor <= 0) return 0;
  return Math.max(0, (goal - fvCurrent) / annuityFactor);
}

/** Future value of current corpus + monthly contributions at a given annual %. */
function futureValueAt(
  annualPct: number,
  current: number,
  monthly: number,
  months: number,
): number {
  const m = annualPct / 100 / 12;
  const g = Math.pow(1 + m, months);
  const annuity = m === 0 ? months : (g - 1) / m;
  return current * g + monthly * annuity;
}

/**
 * The annual return RATE the plan actually needs: solve for r such that
 * current + monthly contributions compound to exactly the goal. This is the
 * honest "what % must my money earn?" number — compare it to what's realistic.
 *   - returns 0 if contributions alone already reach the goal (no growth needed)
 *   - returns null if even a very high return can't get there (need more savings/time)
 */
function requiredAnnualReturn(
  goal: number,
  current: number,
  monthly: number,
  months: number,
): number | null {
  if (futureValueAt(0, current, monthly, months) >= goal) return 0;
  let lo = 0;
  let hi = 60; // 60%/yr ceiling — beyond this the goal is effectively unreachable
  if (futureValueAt(hi, current, monthly, months) < goal) return null;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (futureValueAt(mid, current, monthly, months) < goal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function projectMilestones({
  startingCorpus,
  monthlyContribution,
  monthsToGoal,
  risk,
}: {
  startingCorpus: number;
  monthlyContribution: number;
  monthsToGoal: number;
  risk: RiskTolerance;
}): Milestone[] {
  const annualReturn = risk === "unknown" ? 9 : ASSUMED_RETURN[risk];
  const monthlyReturn = annualReturn / 100 / 12;
  const now = new Date();
  const offsets = pickMonthOffsets(monthsToGoal);

  const milestones: Milestone[] = [
    {
      label: "Now",
      monthsFromNow: 0,
      projectedCorpus: startingCorpus,
      equityPct: equityPctAtMonth(0, monthsToGoal, risk),
      debtPct: 100 - equityPctAtMonth(0, monthsToGoal, risk),
      kind: "now",
    },
  ];

  let corpus = startingCorpus;
  for (let mo = 1; mo <= monthsToGoal; mo++) {
    corpus = corpus * (1 + monthlyReturn) + monthlyContribution;
    if (offsets.includes(mo)) {
      const d = new Date(now.getFullYear(), now.getMonth() + mo, 1);
      const eq = equityPctAtMonth(mo, monthsToGoal, risk);
      milestones.push({
        label: monthLabel(d),
        monthsFromNow: mo,
        projectedCorpus: corpus,
        equityPct: eq,
        debtPct: 100 - eq,
        kind: mo === monthsToGoal ? "goal" : "milestone",
      });
    }
  }
  return milestones;
}

/** Derive a complete projection from a user_plan.md content string. */
export function projectFromUserPlan(
  planText: string,
): MilestoneProjection | null {
  const plan = parseUserPlan(planText);
  // Horizon: prefer the actual target date; fall back to a stated horizon.
  const monthsToGoal =
    monthsUntil(plan.goalDate) ??
    (plan.horizonYears !== null ? Math.round(plan.horizonYears * 12) : null);

  if (
    plan.goalAmount === null ||
    plan.currentCorpus === null ||
    plan.monthlyInvestable === null ||
    monthsToGoal === null
  ) {
    return null;
  }

  const risk = parseRiskTolerance(planText);
  const assumedReturn = risk === "unknown" ? 9 : ASSUMED_RETURN[risk];
  const monthlyReturn = assumedReturn / 100 / 12;

  const milestones = projectMilestones({
    startingCorpus: plan.currentCorpus,
    monthlyContribution: plan.monthlyInvestable,
    monthsToGoal,
    risk,
  });
  const projectedFinal =
    milestones[milestones.length - 1]?.projectedCorpus ?? plan.currentCorpus;
  const requiredMonthly = requiredMonthlyContribution(
    plan.goalAmount,
    plan.currentCorpus,
    monthsToGoal,
    monthlyReturn,
  );
  // The return rate the plan needs, GIVEN the planned monthly contribution.
  const requiredReturn = requiredAnnualReturn(
    plan.goalAmount,
    plan.currentCorpus,
    plan.monthlyInvestable,
    monthsToGoal,
  );

  return {
    plan,
    risk,
    assumedReturn,
    monthsToGoal,
    milestones,
    projectedFinal,
    plannedMonthly: plan.monthlyInvestable,
    requiredMonthly,
    requiredReturn,
    goalAmount: plan.goalAmount,
    onTrack: projectedFinal >= plan.goalAmount,
  };
}
