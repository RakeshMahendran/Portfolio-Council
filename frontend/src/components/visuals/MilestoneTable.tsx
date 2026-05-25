"use client";

import clsx from "clsx";
import { Flag, MapPin, Route, Wallet, ShieldCheck, TrendingUp } from "lucide-react";
import {
  projectFromUserPlan,
  type MilestoneProjection,
} from "@/lib/milestones";
import { formatInr } from "@/lib/parse-artifacts";

/**
 * "Roadmap to <goal>" — answers, in plain money terms:
 *   1. Where the goal comes from (money you have + savings + the growth needed)
 *   2. Where your money should SIT by the goal (target mix, % and ₹)
 *   3. The trajectory (target value by date)
 *
 * Month-based compound math from user_plan.md. Works for a 13-month house
 * goal and a 30-year retirement alike. A trajectory, not a guarantee.
 */
export function MilestoneTable({ planText }: { planText: string | null }) {
  if (!planText) return null;
  const result = projectFromUserPlan(planText);
  if (!result) return null;
  return <RoadmapContent {...result} />;
}

function RoadmapContent({
  assumedReturn,
  monthsToGoal,
  milestones,
  projectedFinal,
  plannedMonthly,
  requiredMonthly,
  requiredReturn,
  goalAmount,
}: MilestoneProjection) {
  const goalLabel = milestones[milestones.length - 1]?.label ?? "goal";
  const goalMs = milestones[milestones.length - 1];
  const currentCorpus = milestones[0]?.projectedCorpus ?? 0;

  const horizonText =
    monthsToGoal >= 24
      ? `${(monthsToGoal / 12).toFixed(monthsToGoal % 12 === 0 ? 0 : 1)} years`
      : `${monthsToGoal} months`;

  // ── The split: where the goal comes from ──────────────────────────────
  const contributions = plannedMonthly * monthsToGoal; // nominal savings added
  const nominalSubtotal = currentCorpus + contributions; // with zero growth
  const growthNeeded = Math.max(0, goalAmount - nominalSubtotal);
  const nominalPct = goalAmount > 0 ? (nominalSubtotal / goalAmount) * 100 : 0;
  const noGrowthNeeded = growthNeeded <= goalAmount * 0.005; // ≤0.5% → call it none
  const returnComfortable =
    requiredReturn !== null && requiredReturn <= assumedReturn;
  const reachable = requiredReturn !== null;

  // ── Target mix at the goal (from the glide path) ──────────────────────
  const goalEquityPct = goalMs?.equityPct ?? 20;
  const goalSafePct = 100 - goalEquityPct;
  const growthRupees = (goalAmount * goalEquityPct) / 100;
  const safeRupees = (goalAmount * goalSafePct) / 100;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Route className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-medium text-zinc-100">
            Your roadmap to {formatInr(goalAmount, { short: true })}
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500">
          {goalLabel} · {horizonText} left
        </span>
      </div>

      {/* ── 1. THE SPLIT — where the money comes from ────────────────── */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2.5">
          How you get there
        </div>
        <SplitRow label="Money you already have" value={currentCorpus} />
        <SplitRow
          label={`Savings you'll add (${formatInr(plannedMonthly, { short: true })} × ${monthsToGoal})`}
          value={contributions}
          plus
        />
        <div className="my-2 h-px bg-zinc-800" />
        <SplitRow
          label="Subtotal — even if nothing grows"
          value={nominalSubtotal}
          strong
          note={`${nominalPct.toFixed(0)}% of goal`}
        />
        {/* The growth line — the honest "what your money must earn" */}
        <div className="mt-2.5 flex items-start gap-2">
          <TrendingUp
            className={clsx(
              "w-3.5 h-3.5 mt-0.5 shrink-0",
              noGrowthNeeded || returnComfortable ? "text-emerald-400" : "text-amber-400",
            )}
          />
          <p className="text-xs leading-relaxed text-zinc-400">
            {noGrowthNeeded ? (
              <>
                Your savings + current money <span className="text-emerald-300 font-medium">already cover the goal</span> —
                you need <span className="text-emerald-300 font-medium">no investment growth</span>. You can hold
                everything in capital-safe instruments.
              </>
            ) : !reachable ? (
              <>
                Growth needed: <span className="text-amber-300 font-medium">{formatInr(growthNeeded, { short: true })}</span> —
                more than a safe return can deliver at this pace. Raise savings toward{" "}
                <span className="text-amber-300 font-medium">{formatInr(requiredMonthly, { short: true })}/mo</span> or extend the date.
              </>
            ) : (
              <>
                Only <span className={clsx("font-medium", returnComfortable ? "text-emerald-300" : "text-amber-300")}>
                  {formatInr(growthNeeded, { short: true })} of growth
                </span>{" "}
                must come from returns — about{" "}
                <span className={clsx("font-medium", returnComfortable ? "text-emerald-300" : "text-amber-300")}>
                  {requiredReturn!.toFixed(1)}% a year
                </span>
                .{" "}
                {returnComfortable ? (
                  <span className="text-emerald-400">
                    Well within a safe debt/liquid mix (~{assumedReturn}%) — you can de-risk and still make it. ✓
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Above the ~{assumedReturn}% a low-risk mix targets — safer to save more or extend the date.
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── 2. TARGET MIX — where the money should SIT by the goal ────── */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 mb-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2.5">
          Where your {formatInr(goalAmount, { short: true })} should sit by {goalLabel}
        </div>
        {/* allocation bar */}
        <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-zinc-800 mb-3">
          <div className="bg-teal-500" style={{ width: `${goalEquityPct}%` }} />
          <div className="bg-emerald-600" style={{ width: `${goalSafePct}%` }} />
        </div>
        <AllocRow
          icon={<TrendingUp className="w-3.5 h-3.5 text-teal-400" />}
          label="Growth assets (equity / hybrid)"
          pct={goalEquityPct}
          rupees={growthRupees}
          swatch="bg-teal-500"
        />
        <AllocRow
          icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
          label="Capital-safe (debt / liquid / FD)"
          pct={goalSafePct}
          rupees={safeRupees}
          swatch="bg-emerald-600"
        />
        <p className="mt-2.5 text-[11px] text-zinc-500 leading-relaxed">
          Mostly capital-safe by the goal — a drawdown right before the purchase is the one
          thing you can&apos;t afford. For the exact funds, see the Strategist&apos;s plan.
        </p>
      </div>

      {/* ── 3. TRAJECTORY — target value by date ──────────────────────── */}
      <div className="rounded-lg border border-zinc-800 overflow-hidden">
        <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-900/60">
          Target value along the way
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-zinc-800/60">
            {milestones.map((m) => {
              const pctOfGoal =
                goalAmount > 0 ? (m.projectedCorpus / goalAmount) * 100 : 0;
              return (
                <tr
                  key={m.label}
                  className={clsx(
                    m.kind === "now" && "bg-teal-950/20",
                    m.kind === "goal" && "bg-emerald-950/20",
                  )}
                >
                  <td className="px-3 py-2 w-28">
                    <div className="flex items-center gap-2">
                      {m.kind === "now" && <MapPin className="w-3.5 h-3.5 text-teal-400" />}
                      {m.kind === "goal" && <Flag className="w-3.5 h-3.5 text-emerald-400" />}
                      <span
                        className={clsx(
                          "font-medium",
                          m.kind === "now" && "text-teal-300",
                          m.kind === "goal" && "text-emerald-300",
                          m.kind === "milestone" && "text-zinc-300",
                        )}
                      >
                        {m.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {/* mini progress toward goal */}
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full",
                          pctOfGoal >= 100 ? "bg-emerald-500" : "brand-gradient",
                        )}
                        style={{ width: `${Math.min(100, pctOfGoal)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums w-32">
                    <span
                      className={clsx(
                        "font-semibold",
                        m.kind === "goal" ? "text-emerald-200" : "text-zinc-100",
                      )}
                    >
                      {formatInr(m.projectedCorpus, { short: true })}
                    </span>
                    <span className="block text-[10px] text-zinc-500 tabular-nums">
                      {pctOfGoal.toFixed(0)}% of goal
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-zinc-600 italic">
        Compound projection of monthly contributions at the assumed annual return — a trajectory,
        not a guarantee. Actual outcomes depend on the market path and discipline.
      </p>
    </div>
  );
}

function SplitRow({
  label,
  value,
  plus,
  strong,
  note,
}: {
  label: string;
  value: number;
  plus?: boolean;
  strong?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={clsx("text-sm", strong ? "text-zinc-200 font-medium" : "text-zinc-400")}>
        {plus && <span className="text-zinc-600 mr-1">+</span>}
        {label}
      </span>
      <span className="flex items-baseline gap-2 shrink-0">
        {note && <span className="text-[10px] text-zinc-500">{note}</span>}
        <span className={clsx("tabular-nums", strong ? "text-zinc-100 font-semibold" : "text-zinc-300")}>
          {formatInr(value, { short: true })}
        </span>
      </span>
    </div>
  );
}

function AllocRow({
  icon,
  label,
  pct,
  rupees,
  swatch,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  rupees: number;
  swatch: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className={clsx("w-2.5 h-2.5 rounded-sm shrink-0", swatch)} />
      {icon}
      <span className="text-sm text-zinc-300 flex-1 min-w-0 truncate">{label}</span>
      <span className="text-sm text-zinc-100 font-semibold tabular-nums">{pct}%</span>
      <span className="text-xs text-zinc-500 tabular-nums w-16 text-right">
        {formatInr(rupees, { short: true })}
      </span>
    </div>
  );
}
