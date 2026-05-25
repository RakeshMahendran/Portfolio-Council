"use client";

import clsx from "clsx";
import {
  ArrowRight,
  Check,
  CircleDot,
  Loader2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getLatestSession,
  getWorkspaceFile,
  type SessionData,
} from "@/lib/api";
import {
  parseAnalyst,
  parseExecution,
  parseRisk,
  parseStrategist,
} from "@/lib/parse-artifacts";
import { AgentIcon, AGENT_META, AGENT_ORDER, type AgentKey } from "@/components/AgentIcon";

/**
 * The Council's latest verdict at a glance — 4 compact cards, one per agent.
 * Each card extracts a SINGLE punchy summary from the agent's artifact
 * (verdict, count, key number) and links to the full detail page.
 *
 * Hides itself entirely if no session has run yet (the home page handles
 * the empty state separately with the Run-review CTA).
 */
export function AgentSummaryGrid() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [summaries, setSummaries] = useState<Partial<Record<AgentKey, string>>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getLatestSession();
        if (cancelled) return;
        setSession(s);
        // Fetch each agent's artifact in parallel + summarize.
        const fetches = AGENT_ORDER.map(async (key) => {
          const a = s.agents[key];
          if (!a?.exists || !a.filename) return [key, null] as const;
          try {
            const { raw } = await getWorkspaceFile(a.filename);
            return [key, summarize(key, raw)] as const;
          } catch {
            return [key, null] as const;
          }
        });
        const results = await Promise.all(fetches);
        if (!cancelled) {
          const map: Partial<Record<AgentKey, string>> = {};
          for (const [k, v] of results) if (v) map[k] = v;
          setSummaries(map);
        }
      } catch {
        // No session yet — that's fine.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the entire section if no session exists.
  const anyArtifact = AGENT_ORDER.some((k) => session?.agents[k]?.exists);
  if (!loading && !anyArtifact) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          The Council's latest decision
        </h2>
        {session?.date && (
          <span className="text-xs text-zinc-500 font-mono">
            {session.date}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {AGENT_ORDER.map((key) => {
          const meta = AGENT_META[key];
          const agent = session?.agents[key];
          const hasArtifact = agent?.exists;
          const filename = agent?.filename;
          const summary = summaries[key];
          const href = filename
            ? `/session/${key}?file=${encodeURIComponent(filename)}`
            : `/session/${key}`;

          return (
            <Link
              key={key}
              href={href}
              className={clsx(
                "group rounded-xl border p-4 transition flex flex-col gap-2",
                hasArtifact
                  ? "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70"
                  : "border-zinc-900 bg-zinc-950/40 text-zinc-600",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <AgentIcon agent={key} size="sm" />
                  <span className="text-sm font-medium text-zinc-200">
                    {meta.name}
                  </span>
                </div>
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-600 shrink-0" />
                ) : hasArtifact ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
                )}
              </div>
              <p
                className={clsx(
                  "text-xs leading-snug flex-1",
                  hasArtifact ? "text-zinc-300" : "text-zinc-600 italic",
                )}
              >
                {hasArtifact
                  ? (summary ?? "Loading…")
                  : "No artifact yet — run a portfolio review to populate"}
              </p>
              <div
                className={clsx(
                  "text-[11px] flex items-center gap-1 mt-1",
                  hasArtifact
                    ? "text-teal-400 group-hover:text-teal-300"
                    : "text-zinc-600",
                )}
              >
                View detail
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Generate a single-sentence summary specific to each agent's role. */
function summarize(key: AgentKey, raw: string): string {
  if (key === "analyst") {
    const a = parseAnalyst(raw);
    const parts: string[] = [];
    if (a.totalPortfolio !== null) {
      parts.push(`Portfolio: ${shortInr(a.totalPortfolio)}`);
    }
    if (a.liquidityStatus) {
      parts.push(`liquidity ${a.liquidityStatus.toLowerCase()}`);
    }
    if (a.composition.length > 0) {
      parts.push(`${a.composition.length} asset class${a.composition.length === 1 ? "" : "es"}`);
    }
    return parts.join(" · ") || "Facts captured";
  }

  if (key === "strategist") {
    const s = parseStrategist(raw);
    const parts: string[] = [];
    if (s.trancheCount > 0) {
      parts.push(`${s.trancheCount} phased tranche${s.trancheCount === 1 ? "" : "s"}`);
    }
    if (s.hasPlanB) parts.push("Plan B ready");
    if (s.proposalSummary) {
      const firstSentence = s.proposalSummary.split(/[.!?]\s/)[0].slice(0, 90);
      parts.unshift(firstSentence);
    }
    return parts.join(" · ") || "Proposal captured";
  }

  if (key === "risk") {
    const r = parseRisk(raw);
    const parts: string[] = [];
    if (r.verdict) {
      parts.push(`${r.verdict}`);
    }
    if (r.confidence !== null) parts.push(`${r.confidence}% confidence`);
    const passed = r.rules.filter((x) => x.status === "pass").length;
    const total = r.rules.length;
    if (total > 0) parts.push(`${passed}/${total} rules passed`);
    return parts.join(" · ") || "Verdict pending";
  }

  if (key === "execution") {
    const e = parseExecution(raw);
    const parts: string[] = [];
    if (e.orders.length > 0) {
      parts.push(`${e.orders.length} order${e.orders.length === 1 ? "" : "s"}`);
    }
    if (e.netDeployment !== null) {
      parts.push(`${shortInr(e.netDeployment)} deployment`);
    }
    return parts.join(" · ") || "No execution required";
  }

  return "";
}

function shortInr(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}
