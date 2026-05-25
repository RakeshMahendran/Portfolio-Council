"use client";

import clsx from "clsx";
import { projectFromUserPlan } from "@/lib/milestones";

type GoalProgressProps = {
  targetAmount?: number;
  currentValue?: number;
  /** Human-friendly target date label, e.g. "May 2027". */
  targetDate?: string;
  /** Raw user_plan.md — enables a contribution-aware on-track status. */
  planText?: string | null;
  loading?: boolean;
};

/**
 * Format an INR amount using Indian conventions (lakh/crore).
 *  < 1L      -> ₹50,000
 *  >= 1L     -> ₹6.84L
 *  >= 1Cr    -> ₹1.2Cr
 */
function formatINR(amount: number): string {
  if (!isFinite(amount)) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) {
    // crore
    const cr = amount / 1_00_00_000;
    return `₹${trim(cr)}Cr`;
  }
  if (abs >= 1_00_000) {
    // lakh
    const l = amount / 1_00_000;
    return `₹${trim(l)}L`;
  }
  // Use Indian digit grouping for sub-lakh amounts.
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Trim to 2 decimals, drop trailing zeros. */
function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Parse target labels like "May 2027" into a Date at month start.
 * Falls back to Date.parse for ISO strings. Returns null if unparseable.
 */
function parseTargetDate(label: string): Date | null {
  const direct = new Date(label);
  if (!isNaN(direct.getTime())) return direct;
  const m = label.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (m) {
    const d = new Date(`${m[1]} 1, ${m[2]}`);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Whole months between two dates (>=0). */
function monthsBetween(a: Date, b: Date): number {
  const months =
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth());
  return Math.max(0, months);
}

type Status = "on_track" | "behind" | "at_risk";

function statusFor(percentDone: number, percentElapsed: number): Status {
  // Linear glide path: how far ahead/behind we are vs schedule.
  // Allow a small buffer before flagging behind.
  const delta = percentDone - percentElapsed;
  if (delta >= -5) return "on_track";
  if (delta >= -15) return "behind";
  return "at_risk";
}

// The progress bar always uses the brand gradient (it's the signature hero
// element); pace is communicated by the semantic status pill instead.
const STATUS_META: Record<Status, { label: string; pill: string }> = {
  on_track: {
    label: "ON TRACK",
    pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  },
  behind: {
    label: "BEHIND",
    pill: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  },
  at_risk: {
    label: "AT RISK",
    pill: "bg-red-500/15 text-red-300 border-red-500/40",
  },
};

export default function GoalProgress({
  targetAmount,
  currentValue,
  targetDate,
  planText,
  loading,
}: GoalProgressProps) {
  const hasData =
    !loading &&
    typeof targetAmount === "number" &&
    typeof currentValue === "number" &&
    targetAmount > 0;

  if (!hasData) {
    return (
      <div
        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6
                   animate-pulse"
        aria-busy="true"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-40 rounded bg-zinc-800" />
          <div className="h-5 w-20 rounded-full bg-zinc-800" />
        </div>
        <div className="h-3 w-full rounded-full bg-zinc-800 mb-3" />
        <div className="h-4 w-56 rounded bg-zinc-800" />
      </div>
    );
  }

  // Narrowed by hasData check above.
  const target = targetAmount as number;
  const current = currentValue as number;

  const rawPct = (current / target) * 100;
  const percentDone = Math.max(0, Math.min(100, rawPct));

  // Months-left calculation (best-effort; doesn't break the widget if absent).
  const now = new Date();
  const parsed = targetDate ? parseTargetDate(targetDate) : null;
  const monthsLeft = parsed ? monthsBetween(now, parsed) : null;

  // For status, we need an "elapsed" notion. Without a known start date we
  // approximate using a 36-month default glide path centered on the target.
  // If monthsLeft is unknown, default to on_track.
  // Prefer a contribution-aware projection (same engine as the Milestones
  // card) so this badge can't contradict it. Fall back to the %-elapsed
  // heuristic only when we have no plan text to project from.
  let status: Status = "on_track";
  const proj = planText ? projectFromUserPlan(planText) : null;
  if (proj && proj.goalAmount > 0) {
    const coverage = (proj.projectedFinal / proj.goalAmount) * 100;
    status = coverage >= 100 ? "on_track" : coverage >= 85 ? "behind" : "at_risk";
  } else if (monthsLeft !== null) {
    const totalMonthsAssumed = 36;
    const elapsed = Math.max(0, totalMonthsAssumed - monthsLeft);
    const percentElapsed =
      (Math.min(elapsed, totalMonthsAssumed) / totalMonthsAssumed) * 100;
    status = statusFor(percentDone, percentElapsed);
  }
  const meta = STATUS_META[status];

  return (
    <div
      className="w-full rounded-2xl border border-zinc-800 bg-gradient-to-b
                 from-zinc-900/70 to-zinc-900/30 p-6 shadow-lg"
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] text-zinc-500">
            Goal progress
          </div>
          <div className="mt-1 flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-semibold text-zinc-100">
              {formatINR(current)}
            </span>
            <span className="text-sm text-zinc-500">of</span>
            <span className="text-lg text-zinc-300">{formatINR(target)}</span>
          </div>
        </div>
        <span
          className={clsx(
            "text-[10px] font-semibold tracking-[0.15em] px-2.5 py-1",
            "rounded-full border",
            meta.pill,
          )}
        >
          {meta.label}
        </span>
      </div>

      <div
        className="relative h-3 w-full rounded-full bg-zinc-800/80 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentDone)}
      >
        <div
          className="h-full rounded-full transition-all brand-gradient"
          style={{ width: `${percentDone}%` }}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
        <span className="font-mono text-zinc-200">
          {percentDone.toFixed(1)}%
        </span>
        {monthsLeft !== null && targetDate && (
          <>
            <span className="text-zinc-600">·</span>
            <span>
              {monthsLeft} {monthsLeft === 1 ? "month" : "months"} left to{" "}
              <span className="text-zinc-200">{targetDate}</span>
            </span>
          </>
        )}
        {monthsLeft === null && targetDate && (
          <>
            <span className="text-zinc-600">·</span>
            <span>
              target <span className="text-zinc-200">{targetDate}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
