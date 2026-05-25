"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Eye,
  Loader2,
  PlayCircle,
  Play,
  Search,
  ShieldAlert,
  Sparkles,
  Terminal,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "sonner";
import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getLatestSession,
  streamRun,
  stripAnsi,
  type AgentSummary,
  type SessionData,
} from "@/lib/api";
import type { StreamMsg } from "@/lib/types";

const AGENT_LABELS = {
  analyst: {
    name: "Analyst",
    Icon: Search,
    description: "Observes facts",
    accent: "blue",
  },
  strategist: {
    name: "Strategist",
    Icon: TrendingUp,
    description: "Proposes actions",
    accent: "amber",
  },
  risk: {
    name: "Risk Officer",
    Icon: ShieldAlert,
    description: "Adversarial review",
    accent: "red",
  },
  execution: {
    name: "Execution",
    Icon: CheckCircle2,
    description: "Translates to orders",
    accent: "emerald",
  },
} as const;

type AgentKey = keyof typeof AGENT_LABELS;
const AGENT_KEYS: AgentKey[] = ["analyst", "strategist", "risk", "execution"];

type RunStatus = "idle" | "running" | "complete" | "failed";

export default function SessionPage() {
  return (
    <Suspense fallback={null}>
      <SessionPageInner />
    </Suspense>
  );
}

function SessionPageInner() {
  const search = useSearchParams();
  const initialPrompt = search.get("prompt") ?? "";

  const [session, setSession] = useState<SessionData | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [streamLog, setStreamLog] = useState<StreamMsg[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentKey | null>(null);
  const [agentStartedAt, setAgentStartedAt] = useState<
    Record<AgentKey, number | null>
  >({ analyst: null, strategist: null, risk: null, execution: null });
  const [lastStepPerAgent, setLastStepPerAgent] = useState<
    Record<AgentKey, string | undefined>
  >({ analyst: undefined, strategist: undefined, risk: undefined, execution: undefined });
  const [showDrawer, setShowDrawer] = useState(false);
  const [autoStartConsumed, setAutoStartConsumed] = useState(false);

  const drawerLogRef = useRef<HTMLDivElement | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const s = await getLatestSession();
      setSession(s);
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    // auto-scroll drawer log
    if (drawerLogRef.current) {
      drawerLogRef.current.scrollTop = drawerLogRef.current.scrollHeight;
    }
  }, [streamLog]);

  const runReview = useCallback(
    async (prompt?: string) => {
      const text =
        prompt?.trim() || "Run a complete portfolio review session for today.";
      setRunStatus("running");
      setStreamLog([]);
      setActiveAgent(null);

      // Reset per-agent state at start of run
      setAgentStartedAt({
        analyst: null,
        strategist: null,
        risk: null,
        execution: null,
      });
      setLastStepPerAgent({
        analyst: undefined,
        strategist: undefined,
        risk: undefined,
        execution: undefined,
      });

      let currentAgent: AgentKey | null = null;

      const transitionTo = (next: AgentKey) => {
        currentAgent = next;
        setActiveAgent(next);
        setAgentStartedAt((prev) =>
          prev[next] ? prev : { ...prev, [next]: Date.now() },
        );
      };

      try {
        for await (const msg of streamRun(text)) {
          setStreamLog((prev) => [...prev, msg]);

          // Heuristics: detect agent transitions from orchestrator output
          if (
            (msg.type === "output" ||
              msg.type === "tool_use" ||
              msg.type === "task_end") &&
            "text" in msg
          ) {
            const raw = stripAnsi(msg.text);
            const t = raw.toLowerCase();

            // Detect which agent is currently active via three signals,
            // in priority order:
            //
            //  1. The literal gitclaw subprocess invocation
            //     (`gitclaw --dir agents/<name>` or `agents/<name>/…`).
            //     Most reliable — only fires when the orchestrator actually
            //     spawns the sub-agent.
            //  2. A workspace file-write that's keyed to an agent's role
            //     (analysis→analyst, proposal→strategist, …). Useful for
            //     marking that an agent FINISHED, but we re-use it to
            //     transition TO that agent if signal 1 was missed.
            //  3. Loose prose match: any "delegate*/handing*/now*/proceed*
            //     <agent name>" phrasing. Backup for orchestrators that
            //     don't use the cli tool for delegation.
            const cliDir = raw.match(/agents\/(analyst|strategist|risk|execution)\b/i);
            if (cliDir) {
              transitionTo(cliDir[1].toLowerCase() as AgentKey);
            } else {
              const fileRole = raw.match(
                /\b(analysis|proposal|verdict|orders)-\d{4}-\d{2}-\d{2}\.md\b/,
              );
              const roleToAgent: Record<string, AgentKey> = {
                analysis: "analyst",
                proposal: "strategist",
                verdict: "risk",
                orders: "execution",
              };
              if (fileRole && roleToAgent[fileRole[1]]) {
                transitionTo(roleToAgent[fileRole[1]]);
              } else {
                const verb = /(delegate|delegating|handing|hand off|proceed|now|next).{0,40}/i;
                if (verb.test(raw)) {
                  // Check in REVERSE pipeline order so "Analyst completed.
                  // Now to Strategist" lands on Strategist, not Analyst.
                  // Risk-tolerance / risk-profile phrasings are excluded
                  // from the Risk match because they show up in onboarding
                  // contexts where the orchestrator merely mentions the
                  // user's risk preference, not the Risk agent.
                  if (/\bexecution\b/i.test(raw)) transitionTo("execution");
                  else if (
                    /\brisk\b/i.test(raw) &&
                    !/risk tolerance|risk profile/i.test(raw)
                  )
                    transitionTo("risk");
                  else if (/\bstrategist\b/i.test(raw)) transitionTo("strategist");
                  else if (/\banalyst\b/i.test(raw)) transitionTo("analyst");
                }
              }
            }

            // Capture the most recent step text for the active agent
            if (currentAgent && raw.trim()) {
              const agentKey = currentAgent;
              setLastStepPerAgent((prev) => ({ ...prev, [agentKey]: raw }));
            }
          }
        }
        setRunStatus("complete");
        setActiveAgent(null);
        await refreshSession();
      } catch (e) {
        console.error("Run failed:", e);
        setRunStatus("failed");
      }
    },
    [refreshSession],
  );

  // Auto-start if a prompt was passed in the URL (e.g. from the home page CTA)
  useEffect(() => {
    if (!autoStartConsumed && initialPrompt && runStatus === "idle") {
      setAutoStartConsumed(true);
      runReview(initialPrompt);
    }
  }, [autoStartConsumed, initialPrompt, runStatus, runReview]);

  const onRunClick = () => runReview();

  // Verdict badge from Risk agent
  const verdict = session?.agents.risk?.verdict ?? null;
  const sessionVetoed = verdict === "VETO";

  return (
    <div className="flex-1 brand-aura text-zinc-100">
      <SiteHeader
        backHref="/"
        pageContext={
          <>
            <span className="text-sm text-zinc-400">Portfolio Review</span>
            {session?.date && (
              <span className="text-xs text-zinc-500 font-mono">
                · {session.date}
              </span>
            )}
            {runStatus === "running" && (
              <StatusBadge variant="pending">running</StatusBadge>
            )}
            {runStatus === "complete" && !sessionVetoed && (
              <StatusBadge variant="success">approved</StatusBadge>
            )}
            {sessionVetoed && <StatusBadge variant="danger">vetoed</StatusBadge>}
          </>
        }
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Run button + summary banner */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                {runStatus === "running" ? "Live session" : "Latest session"}
              </span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {runStatus === "running"
                ? "Agents are debating…"
                : session?.date
                  ? `Session ${session.date}`
                  : "No sessions yet"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5 max-w-prose">
              4 specialist agents review every decision. Each commit signed by
              the team.{" "}
              <Link
                href="/dev"
                className="hover:text-zinc-300 underline underline-offset-2"
              >
                See the git log →
              </Link>
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={onRunClick}
            loading={runStatus === "running"}
          >
            {runStatus !== "running" && <Play className="w-4 h-4" />}
            {runStatus === "running" ? "Running" : "Run portfolio review"}
          </Button>
        </div>

        {/* VETO banner */}
        {sessionVetoed && session?.agents.risk?.summary?.[0] && (
          <div className="border border-red-900/60 bg-gradient-to-br from-red-950/40 to-red-950/10 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-900/40 border border-red-800/60 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5 text-red-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-red-300">
                  Session VETOED by Risk Officer
                </div>
                <div className="text-xs text-red-200/80 mt-1 leading-relaxed">
                  {session.agents.risk.summary[0]}
                </div>
                <Link
                  href={`/session/risk?file=${session.agents.risk.filename ?? ""}`}
                  className="text-xs text-red-300 hover:text-red-200 mt-2 inline-flex items-center gap-1"
                >
                  Read Risk Officer&apos;s full reasoning
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Empty state when no past session AND not currently running */}
        {!session?.date && runStatus === "idle" ? (
          <EmptyState
            icon={PlayCircle}
            title="No sessions yet"
            description="Click 'Run portfolio review' above to spawn the agent debate. The four agents will analyse your holdings, propose a rebalance, and either approve or veto — with the full deliberation committed to git."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="primary" onClick={onRunClick}>
                  <Play className="w-3.5 h-3.5" />
                  Run portfolio review
                </Button>
                <Link
                  href="/profile"
                  className="text-sm text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1.5"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Need to upload holdings?
                </Link>
              </div>
            }
          />
        ) : (
          /* 2×2 agent grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AGENT_KEYS.map((key) => (
              <AgentCard
                key={key}
                agentKey={key}
                summary={session?.agents[key]}
                isActive={activeAgent === key}
                isRunning={runStatus === "running"}
                startedAt={agentStartedAt[key]}
                lastStepText={lastStepPerAgent[key]}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button — Process logs */}
      <button
        onClick={() => setShowDrawer(true)}
        aria-label="View process logs"
        title="View raw gitclaw stream"
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 ${
          runStatus === "running"
            ? "bg-amber-600 hover:bg-amber-500 ring-4 ring-amber-600/30 animate-pulse"
            : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
        }`}
      >
        <Terminal className="w-5 h-5 text-zinc-100" />
        {streamLog.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
            {streamLog.length > 99 ? "99+" : streamLog.length}
          </span>
        )}
      </button>

      {/* Drawer for raw stream */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex justify-end backdrop-blur-sm"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="bg-zinc-950 border-l border-zinc-800 w-full max-w-2xl flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Process log</div>
                  <div className="text-xs text-zinc-500">
                    Raw gitclaw stream · {streamLog.length} events
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                aria-label="Close drawer"
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              ref={drawerLogRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
            >
              {streamLog.length === 0 && (
                <div className="text-zinc-600 italic text-center py-8">
                  Click &quot;Run portfolio review&quot; to see live activity.
                </div>
              )}
              {streamLog.map((m, i) => (
                <RawEvent key={i} msg={m} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────

function AgentCard({
  agentKey,
  summary,
  isActive,
  isRunning,
  lastStepText,
  startedAt,
}: {
  agentKey: AgentKey;
  summary?: AgentSummary;
  isActive: boolean;
  isRunning: boolean;
  lastStepText?: string;
  startedAt?: number | null;
}) {
  const meta = AGENT_LABELS[agentKey];
  const Icon = meta.Icon;

  // Determine status
  let status: "idle" | "running" | "complete" | "veto" | "blocked";
  if (isActive && isRunning) status = "running";
  else if (summary?.exists) {
    if (agentKey === "risk" && summary.verdict === "VETO") status = "veto";
    else status = "complete";
  } else {
    status = "idle";
  }

  const borderClass = {
    idle: "border-zinc-800",
    running: "border-amber-600/80 ring-1 ring-amber-600/30 shadow-lg shadow-amber-900/20",
    complete: "border-emerald-800/60",
    veto: "border-red-800/60 bg-red-950/10",
    blocked: "border-zinc-800 border-dashed opacity-60",
  }[status];

  const iconBg = {
    idle: "bg-zinc-800 border-zinc-700 text-zinc-500",
    running: "bg-amber-900/40 border-amber-800/60 text-amber-300 animate-pulse",
    complete: "bg-emerald-900/40 border-emerald-800/60 text-emerald-300",
    veto: "bg-red-900/40 border-red-800/60 text-red-300",
    blocked: "bg-zinc-800 border-zinc-700 text-zinc-600",
  }[status];

  const statusBadge = {
    idle: <StatusBadge variant="neutral">idle</StatusBadge>,
    running: <StatusBadge variant="pending">running</StatusBadge>,
    complete: <StatusBadge variant="success">complete</StatusBadge>,
    veto: <StatusBadge variant="danger">veto</StatusBadge>,
    blocked: <StatusBadge variant="neutral">blocked</StatusBadge>,
  }[status];

  return (
    <div
      className={`border rounded-lg p-5 bg-zinc-900/40 transition-all ${borderClass}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border ${iconBg}`}
          >
            {status === "running" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">{meta.name}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {meta.description}
            </div>
          </div>
        </div>
        {statusBadge}
      </div>

      {/* Progress bar (only when running) */}
      {status === "running" && (
        <AgentProgress
          startedAt={startedAt ?? null}
          lastStepText={lastStepText}
        />
      )}

      {/* Summary bullets */}
      {status !== "running" && summary?.exists && summary.summary && summary.summary.length > 0 ? (
        <ul className="space-y-2 text-sm text-zinc-300 mb-4 leading-snug">
          {summary.summary.slice(0, 5).map((b, i) => (
            <li key={i} className="flex gap-2 items-start">
              <span className="text-zinc-600 shrink-0 leading-snug">▸</span>
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
      ) : status !== "running" ? (
        <div className="text-xs text-zinc-600 italic mb-4 py-4 text-center border border-dashed border-zinc-800 rounded">
          Run a session to populate this card.
        </div>
      ) : null}

      {/* View full link */}
      {summary?.exists && summary.filename && (
        <Link
          href={`/session/${agentKey}?file=${summary.filename}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors group"
        >
          <Eye className="w-3 h-3" />
          View full report
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
        </Link>
      )}
    </div>
  );
}

function AgentProgress({
  startedAt,
  lastStepText,
}: {
  startedAt: number | null;
  lastStepText?: string;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Asymptotic progress: ramps to 90% over ~120 seconds, never hits 100% until parent flips status
  const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : 0;
  const pct = Math.min(90, Math.round((1 - Math.exp(-elapsed / 45)) * 100));

  // Suppress unused warning — tick triggers re-render
  void tick;

  // Sanitize the step text — truncate, strip ANSI, etc.
  const display = lastStepText
    ? stripAnsi(lastStepText).replace(/^\s*▶\s*/, "").slice(0, 80)
    : "Thinking…";

  return (
    <div className="mb-4 space-y-2">
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-amber-400/80 truncate min-w-0 flex-1">
          {display}
        </span>
        <span className="text-zinc-500 tabular-nums shrink-0 ml-2">
          {Math.floor(elapsed)}s
        </span>
      </div>
    </div>
  );
}

function RawEvent({ msg }: { msg: StreamMsg }) {
  const t = msg.type;
  const text = stripAnsi(String((msg as { text?: string }).text ?? ""));
  if (t === "session_start")
    return <div className="text-emerald-500">▶ session start</div>;
  if (t === "session_end")
    return <div className="text-emerald-500">✓ session end</div>;
  if (t === "tool_use") return <div className="text-amber-400">{text}</div>;
  if (t === "task_end") return <div className="text-teal-400">{text}</div>;
  if (t === "system") return <div className="text-teal-400 italic">{text}</div>;
  if (t === "error" || t === "error_line")
    return (
      <div className="text-red-400">
        {"message" in msg ? (msg as { message: string }).message : text}
      </div>
    );
  if (t === "output" && text.trim()) return <div className="text-zinc-400">{text}</div>;
  return null;
}
