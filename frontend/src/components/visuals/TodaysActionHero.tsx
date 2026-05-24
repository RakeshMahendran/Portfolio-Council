"use client";

import clsx from "clsx";
import { ArrowRight, CheckCircle2, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getLatestSession,
  getWorkspaceFile,
  type SessionData,
} from "@/lib/api";
import { parseExecution, parseRisk, parseStrategist } from "@/lib/parse-artifacts";

type Action = {
  headline: string;
  detail: string | null;
  verdict: "APPROVE" | "AMEND" | "VETO" | null;
  hasOrders: boolean;
};

/**
 * The hero card at the top of the home dashboard — answers "what should I
 * actually do today?" by reading the latest session's three load-bearing
 * artifacts (Risk verdict + Strategist summary + Execution orders).
 *
 * Empty state shown when no session has been run yet — promotes the Run CTA.
 */
export function TodaysActionHero() {
  const [action, setAction] = useState<Action | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getLatestSession();
        if (cancelled) return;
        setSession(s);

        const riskFile = s.agents.risk?.filename;
        const strategistFile = s.agents.strategist?.filename;
        const executionFile = s.agents.execution?.filename;
        if (!riskFile && !strategistFile && !executionFile) return;

        const [riskRaw, stratRaw, execRaw] = await Promise.all([
          riskFile ? getWorkspaceFile(riskFile).then((r) => r.raw).catch(() => null) : null,
          strategistFile ? getWorkspaceFile(strategistFile).then((r) => r.raw).catch(() => null) : null,
          executionFile ? getWorkspaceFile(executionFile).then((r) => r.raw).catch(() => null) : null,
        ]);
        if (cancelled) return;

        const r = riskRaw ? parseRisk(riskRaw) : null;
        const e = execRaw ? parseExecution(execRaw) : null;
        const sg = stratRaw ? parseStrategist(stratRaw) : null;

        // Build the action statement from what we have.
        let headline = "";
        let detail: string | null = null;

        if (r?.verdict === "VETO") {
          headline = "No action today — Risk Officer vetoed the proposal";
          detail = sg?.proposalSummary?.slice(0, 200) ?? null;
        } else if (r?.verdict === "AMEND") {
          headline = "Awaiting Strategist amendments";
          detail = "Risk asked for revisions. The Council will re-run.";
        } else if (e && (e.orders.length > 0 || e.netDeployment !== null)) {
          if (e.netDeployment !== null) {
            headline = `Deploy ${shortInr(e.netDeployment)} today`;
          } else {
            headline = `Place ${e.orders.length} order${e.orders.length === 1 ? "" : "s"} today`;
          }
          if (e.orders.length > 0) {
            const symbols = e.orders.slice(0, 3).map((o) => o.symbol).join(", ");
            detail = `${e.orders.length} order${e.orders.length === 1 ? "" : "s"} via your broker: ${symbols}${e.orders.length > 3 ? "…" : ""}`;
          } else if (sg?.proposalSummary) {
            detail = sg.proposalSummary.slice(0, 200);
          }
        } else if (sg?.proposalSummary) {
          headline = "Review the proposal";
          detail = sg.proposalSummary.slice(0, 200);
        } else if (r?.verdict === "APPROVE") {
          headline = "Council approved the latest plan";
          detail = "View Execution for the orders to place.";
        } else {
          return; // nothing actionable, fall through to empty state
        }

        setAction({
          headline,
          detail,
          verdict: r?.verdict ?? null,
          hasOrders: (e?.orders?.length ?? 0) > 0,
        });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // No session yet → CTA to run one.
  if (!loading && !action) {
    return (
      <section className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-blue-950/30 to-zinc-900/40 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Ready for your first portfolio review
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
              The Council will run Analyst → Strategist → Risk Officer →
              Execution in sequence and commit a single audit-trail report.
              Takes about 12–25 minutes on Bedrock.
            </p>
          </div>
          <Link
            href="/session?prompt=Run+a+complete+portfolio+review+session+for+today."
            className={clsx(
              "shrink-0 inline-flex items-center gap-2 rounded-lg px-5 py-2.5",
              "bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium",
              "shadow-lg shadow-blue-900/30 transition",
            )}
          >
            <Play className="w-4 h-4" />
            Run portfolio review
          </Link>
        </div>
      </section>
    );
  }

  if (!action) return null;

  const isApproved = action.verdict === "APPROVE";
  const isBlocked = action.verdict === "VETO" || action.verdict === "AMEND";

  return (
    <section
      className={clsx(
        "rounded-2xl border-2 p-6",
        isApproved
          ? "border-emerald-700/50 bg-gradient-to-br from-emerald-950/30 to-zinc-900/40"
          : isBlocked
            ? "border-amber-700/50 bg-gradient-to-br from-amber-950/30 to-zinc-900/40"
            : "border-zinc-700/60 bg-gradient-to-br from-blue-950/30 to-zinc-900/40",
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
            Today's action
          </div>
          <h2
            className={clsx(
              "text-2xl font-semibold tracking-tight leading-tight flex items-center gap-2",
              isApproved
                ? "text-emerald-100"
                : isBlocked
                  ? "text-amber-100"
                  : "text-zinc-100",
            )}
          >
            {isApproved && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
            {action.headline}
          </h2>
          {action.detail && (
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
              {action.detail}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action.hasOrders && (
            <Link
              href="/session/execution"
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition"
            >
              View orders
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
          <Link
            href="/session?prompt=Run+a+complete+portfolio+review+session+for+today."
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm font-medium transition"
          >
            <Play className="w-3.5 h-3.5" />
            Run new review
          </Link>
        </div>
      </div>
      {session?.date && (
        <div className="text-[11px] text-zinc-500 mt-3 font-mono">
          From session committed {session.date}
        </div>
      )}
    </section>
  );
}

function shortInr(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} crore`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)} lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
}
