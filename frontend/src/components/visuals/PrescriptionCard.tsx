"use client";

import clsx from "clsx";
import {
  Calendar,
  CircleAlert,
  Clock,
  Pill,
  RotateCw,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getLatestSession,
  getWorkspaceFile,
  getUserPlan,
} from "@/lib/api";
import {
  formatInr,
  parseExecution,
  parseForwardTranches,
  parseNextReview,
  parseOrderRuleCitations,
  parseSIPs,
  parseUserPlan,
  type ExecutionOrder,
  type ForwardTranche,
  type SIPLine,
  type UserPlanParsed,
} from "@/lib/parse-artifacts";
import { NinetyDayTimeline } from "./NinetyDayTimeline";

type RxData = {
  sessionDate: string | null;
  orders: ExecutionOrder[];
  totalDeployment: number | null;
  sips: SIPLine[];
  totalSip: number | null;
  sipStartNote: string | null;
  futureTranches: ForwardTranche[];
  nextReview: ReturnType<typeof parseNextReview>;
  userPlan: UserPlanParsed | null;
  /** Map symbol → ["Hard Rule #2", "Soft Rule #1", …] for per-order "Why" chips. */
  rulesByOrder: Map<string, string[]>;
};

/**
 * The investment prescription — a doctor-prescription-style consolidated view:
 *   - This week: place these orders
 *   - This month onward: set up these SIPs
 *   - Upcoming: future tranches (when detectable)
 *   - When to come back
 *
 * Reads multiple artifacts (orders, proposal, user_plan) and fuses them.
 * Hides sections where parsing came up empty.
 */
export function PrescriptionCard() {
  const [data, setData] = useState<RxData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [session, planResp] = await Promise.all([
          getLatestSession().catch(() => null),
          getUserPlan().catch(() => null),
        ]);
        if (!session) return;

        // Fetch the three artifacts that carry actionable content.
        const [stratRaw, ordersRaw] = await Promise.all([
          session.agents.strategist?.filename
            ? getWorkspaceFile(session.agents.strategist.filename).then((r) => r.raw).catch(() => "")
            : Promise.resolve(""),
          session.agents.execution?.filename
            ? getWorkspaceFile(session.agents.execution.filename).then((r) => r.raw).catch(() => "")
            : Promise.resolve(""),
        ]);
        if (cancelled) return;

        const combinedForRx = stratRaw + "\n\n" + ordersRaw;
        const exec = parseExecution(ordersRaw);
        const sips = parseSIPs(combinedForRx);
        const futureTranches = parseForwardTranches(combinedForRx);
        const nextReview = parseNextReview(combinedForRx);
        const userPlan = planResp ? parseUserPlan(planResp.raw) : null;
        const rulesByOrder = parseOrderRuleCitations(stratRaw);

        setData({
          sessionDate: session.date,
          orders: exec.orders,
          totalDeployment: exec.netDeployment,
          sips: sips.lines,
          totalSip: sips.totalMonthly,
          sipStartNote: sips.startNote,
          futureTranches,
          nextReview,
          userPlan,
          rulesByOrder,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) return null;
  const hasOrders = data.orders.length > 0 || data.totalDeployment !== null;
  const hasSips = data.sips.length > 0 || data.totalSip !== null;
  const hasNext = !!data.nextReview.text || data.nextReview.daysFromNow !== null;
  if (!hasOrders && !hasSips && !hasNext) return null;

  // Compute review due-date from session.date + N days
  const dueDate = computeDueDate(data.sessionDate, data.nextReview.daysFromNow);

  return (
    <section className="rounded-2xl border border-zinc-700/60 bg-zinc-900/60 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-teal-950/40 to-zinc-900/0">
        <div className="flex items-center gap-2.5">
          <Pill className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-zinc-100">
            Your investment instructions
          </h2>
        </div>
        {data.sessionDate && (
          <span className="text-[11px] text-zinc-500 font-mono">
            session {data.sessionDate}
          </span>
        )}
      </header>

      <div className="divide-y divide-zinc-800">
        {/* ── This week — one-time orders ─────────────────────────── */}
        {hasOrders && (
          <RxSection
            icon={<Wallet className="w-4 h-4 text-emerald-400" />}
            title="This week — place these orders"
            subtitle={
              data.totalDeployment !== null
                ? `Total deployment: ${formatInr(data.totalDeployment)} (one-time)`
                : null
            }
          >
            {data.orders.length > 0 ? (
              <ul className="space-y-2">
                {data.orders.map((o) => (
                  <li
                    key={`${o.seq}-${o.symbol}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/40 border border-zinc-800"
                  >
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium tabular-nums">
                      {o.seq}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider",
                            o.action === "BUY"
                              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                              : o.action === "SELL"
                                ? "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                                : "bg-zinc-800 text-zinc-300",
                          )}
                        >
                          {o.action}
                        </span>
                        <span className="font-mono text-sm font-medium text-zinc-100">
                          {o.symbol}
                        </span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {o.qty}{" "}
                          {Number(o.qty) === 1 ? "unit" : "units"}
                        </span>
                        {o.price && (
                          <span className="text-xs text-zinc-500">
                            @ ₹{o.price}
                          </span>
                        )}
                        {o.orderType && (
                          <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                            ({o.orderType})
                          </span>
                        )}
                      </div>
                      {o.sequencing && (
                        <p className="text-[11px] text-zinc-500 mt-1">
                          {o.sequencing}
                        </p>
                      )}
                      {/* Rule chips — why this order serves the governance */}
                      {data.rulesByOrder.get(o.symbol)?.length ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {data.rulesByOrder.get(o.symbol)!.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/60 text-zinc-400"
                              title={`Serves ${r}`}
                            >
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">
                {data.totalDeployment !== null
                  ? `Deploy ${formatInr(data.totalDeployment)} as detailed in the Execution agent's order list.`
                  : "Open the Execution agent for the detailed order list."}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <Link
                href="/session/execution"
                className="text-xs text-teal-400 hover:text-teal-300"
              >
                View full Execution detail →
              </Link>
            </div>
          </RxSection>
        )}

        {/* ── Monthly SIPs ────────────────────────────────────────── */}
        {hasSips && (
          <RxSection
            icon={<RotateCw className="w-4 h-4 text-teal-400" />}
            title={
              data.sipStartNote
                ? `Starting ${data.sipStartNote} — set up these monthly SIPs`
                : "Set up these monthly SIPs"
            }
            subtitle={
              data.totalSip !== null
                ? `Total commitment: ${formatInr(data.totalSip)}/month`
                : null
            }
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.sips.map((sip) => (
                <li
                  key={sip.symbol}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-950/40 border border-zinc-800"
                >
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {sip.symbol}
                  </span>
                  <span className="shrink-0 text-sm text-zinc-100 font-medium tabular-nums">
                    {formatInr(sip.monthlyAmount, { short: true })}
                    <span className="text-[10px] text-zinc-500 ml-0.5">/mo</span>
                  </span>
                </li>
              ))}
            </ul>
          </RxSection>
        )}

        {/* ── Upcoming tranches (when parsed) ─────────────────────── */}
        {data.futureTranches.length > 0 && (
          <RxSection
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            title="Upcoming — decisions you'll make later"
          >
            <ul className="space-y-2">
              {data.futureTranches.map((t, i) => (
                <li
                  key={i}
                  className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-800"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-medium text-zinc-200 text-sm">
                      {t.name}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {t.dateText}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-300 mt-1">
                    Deploy {t.amountText}
                    {t.condition && (
                      <span className="text-amber-300 text-xs ml-2">
                        — only if {t.condition}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </RxSection>
        )}

        {/* ── Next review + triggers ──────────────────────────────── */}
        {hasNext && (
          <RxSection
            icon={<Calendar className="w-4 h-4 text-teal-400" />}
            title={
              dueDate
                ? `Come back on ${dueDate}`
                : data.nextReview.text
                  ? `Come back ${data.nextReview.text}`
                  : "Come back regularly"
            }
            subtitle={
              data.nextReview.daysFromNow
                ? `That's ${data.nextReview.daysFromNow} days from this session`
                : null
            }
          >
            {data.nextReview.triggers.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                  Or sooner if any of these happen
                </p>
                <ul className="flex flex-wrap gap-2">
                  {data.nextReview.triggers.map((trig, i) => (
                    <li
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-amber-800/40 bg-amber-950/20 text-amber-200"
                    >
                      <CircleAlert className="w-3 h-3" />
                      {trig}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </RxSection>
        )}

        {/* ── 90-day forward timeline ─────────────────────────────── */}
        <div className="px-6 py-5">
          <NinetyDayTimeline
            sessionDate={data.sessionDate}
            hasOrders={data.orders.length > 0 || data.totalDeployment !== null}
            sipStartNote={data.sipStartNote}
            futureTranches={data.futureTranches}
            nextReviewDays={data.nextReview.daysFromNow}
          />
        </div>

        {/* ── Goal horizon (constant, always shown) ───────────────── */}
        {data.userPlan?.horizonYears !== null &&
          data.userPlan?.horizonYears !== undefined && (
            <div className="px-6 py-3 bg-zinc-950/40 text-xs text-zinc-500 flex items-center justify-between flex-wrap gap-2">
              <span>
                ⏰ Your goal horizon:{" "}
                <span className="text-zinc-300 font-medium">
                  {data.userPlan.horizonYears} years
                </span>
                {data.userPlan.goalDate && (
                  <span className="text-zinc-500"> (target {data.userPlan.goalDate})</span>
                )}
              </span>
              <span className="text-[10px] text-zinc-600 italic">
                Treat the SIPs as a long-term commitment; today's orders are
                the first deployment of many.
              </span>
            </div>
          )}
      </div>
    </section>
  );
}

function RxSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-start gap-2.5 mb-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          {subtitle && (
            <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="ml-6">{children}</div>
    </div>
  );
}

function computeDueDate(
  sessionDate: string | null,
  daysFromNow: number | null,
): string | null {
  if (!sessionDate || daysFromNow === null) return null;
  // sessionDate is YYYY-MM-DD; parse defensively.
  const parts = sessionDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const base = new Date(
    Number(parts[1]),
    Number(parts[2]) - 1,
    Number(parts[3]),
  );
  base.setDate(base.getDate() + daysFromNow);
  return base.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
