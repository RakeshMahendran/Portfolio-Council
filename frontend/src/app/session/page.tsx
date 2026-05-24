"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import AuthShell from "@/components/AuthShell";
import {
  getLatestSession,
  streamRun,
  stripAnsi,
  type AgentSummary,
  type SessionData,
} from "@/lib/api";
import type { StreamMsg } from "@/lib/types";

const AGENT_LABELS = {
  analyst: { name: "Analyst", icon: "📊", description: "Observes facts" },
  strategist: { name: "Strategist", icon: "💡", description: "Proposes actions" },
  risk: { name: "Risk Officer", icon: "🛑", description: "Adversarial review" },
  execution: { name: "Execution", icon: "✅", description: "Translates to orders" },
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

      try {
        for await (const msg of streamRun(text)) {
          setStreamLog((prev) => [...prev, msg]);

          // Heuristics: detect agent transitions from orchestrator output
          if (msg.type === "output" && "text" in msg) {
            const t = stripAnsi(msg.text).toLowerCase();
            if (t.includes("delegate to analyst") || t.includes("step 1")) {
              setActiveAgent("analyst");
            } else if (
              t.includes("delegate to strategist") ||
              t.includes("step 2")
            ) {
              setActiveAgent("strategist");
            } else if (
              t.includes("delegate to risk") ||
              t.includes("step 3")
            ) {
              setActiveAgent("risk");
            } else if (
              t.includes("delegate to execution") ||
              t.includes("step 4")
            ) {
              setActiveAgent("execution");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-zinc-400 hover:text-zinc-100 transition text-sm"
          >
            ←
          </Link>
          <span className="text-lg font-semibold tracking-tight">
            Portfolio Review
          </span>
          {session?.date && (
            <span className="text-xs text-zinc-500">· {session.date}</span>
          )}
          {runStatus === "running" && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 animate-pulse">
              session in progress
            </span>
          )}
          {runStatus === "complete" && (
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300">
              complete
            </span>
          )}
          {sessionVetoed && (
            <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-300">
              VETOED
            </span>
          )}
        </div>
        <AuthShell />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Run button + summary banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {runStatus === "running"
                ? "Agents debating…"
                : session?.date
                  ? `Latest session: ${session.date}`
                  : "No sessions yet"}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              5 agents · gitclaw-powered · committed to{" "}
              <Link href="/dev" className="hover:text-zinc-300 underline">
                git log
              </Link>
            </p>
          </div>

          <button
            onClick={onRunClick}
            disabled={runStatus === "running"}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-sm font-semibold transition"
          >
            {runStatus === "running" ? "Running…" : "▶ Run portfolio review"}
          </button>
        </div>

        {/* VETO banner */}
        {sessionVetoed && session?.agents.risk?.summary?.[0] && (
          <div className="border border-red-900/60 bg-red-950/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🛑</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-red-300">
                  Session VETOED by Risk Officer
                </div>
                <div className="text-xs text-red-400/80 mt-1">
                  {session.agents.risk.summary[0]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2×2 agent grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENT_KEYS.map((key) => (
            <AgentCard
              key={key}
              agentKey={key}
              summary={session?.agents[key]}
              isActive={activeAgent === key}
              isRunning={runStatus === "running"}
            />
          ))}
        </div>
      </main>

      {/* Floating Action Button — Process logs */}
      <button
        onClick={() => setShowDrawer(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition ${
          runStatus === "running"
            ? "bg-amber-600 hover:bg-amber-500 animate-pulse"
            : "bg-zinc-800 hover:bg-zinc-700"
        }`}
        title="View process logs"
      >
        ⚙
      </button>

      {/* Drawer for raw stream */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="bg-zinc-950 border-l border-zinc-800 w-full max-w-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Process logs</div>
                <div className="text-xs text-zinc-500">
                  Raw gitclaw stream — for debugging
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="text-zinc-400 hover:text-zinc-100 text-xl"
              >
                ✕
              </button>
            </div>
            <div
              ref={drawerLogRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
            >
              {streamLog.length === 0 && (
                <div className="text-zinc-600 italic">
                  Idle — click &quot;Run portfolio review&quot; to start.
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
}: {
  agentKey: AgentKey;
  summary?: AgentSummary;
  isActive: boolean;
  isRunning: boolean;
}) {
  const meta = AGENT_LABELS[agentKey];

  // Determine status
  let status: "idle" | "running" | "complete" | "veto" | "blocked";
  if (isActive && isRunning) status = "running";
  else if (summary?.exists) {
    if (agentKey === "risk" && summary.verdict === "VETO") status = "veto";
    else if (agentKey === "execution" && !summary.exists) status = "blocked";
    else status = "complete";
  } else {
    if (
      agentKey === "execution" &&
      summary &&
      !summary.exists &&
      !isRunning &&
      isAfterRisk()
    ) {
      status = "blocked";
    } else {
      status = "idle";
    }
  }

  function isAfterRisk() {
    // currently unused but reserved for future logic
    return false;
  }

  const borderClass = {
    idle: "border-zinc-800",
    running: "border-amber-600 animate-pulse",
    complete: "border-emerald-700/60",
    veto: "border-red-700/60",
    blocked: "border-zinc-700 border-dashed opacity-60",
  }[status];

  const statusLabel = {
    idle: <span className="text-zinc-600 text-xs">— idle —</span>,
    running: (
      <span className="text-amber-400 text-xs animate-pulse">running…</span>
    ),
    complete: (
      <span className="text-emerald-400 text-xs">✓ done</span>
    ),
    veto: <span className="text-red-400 text-xs font-semibold">VETO</span>,
    blocked: (
      <span className="text-zinc-500 text-xs">blocked (no Risk approval)</span>
    ),
  }[status];

  return (
    <div
      className={`border rounded-lg p-4 bg-zinc-900/40 transition ${borderClass}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <div className="text-sm font-semibold">{meta.name}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {meta.description}
            </div>
          </div>
        </div>
        {statusLabel}
      </div>

      {/* Summary bullets */}
      {summary?.exists && summary.summary && summary.summary.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-zinc-300 mb-3 leading-snug">
          {summary.summary.slice(0, 5).map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-zinc-600 shrink-0">▸</span>
              <span className="min-w-0">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-zinc-600 italic mb-3">
          {status === "running"
            ? "Generating…"
            : status === "blocked"
              ? "Did not run — Risk Officer did not APPROVE."
              : "No artifact yet."}
        </div>
      )}

      {/* View full link */}
      {summary?.exists && summary.filename && (
        <Link
          href={`/session/${agentKey}?file=${summary.filename}`}
          className="text-xs text-zinc-400 hover:text-zinc-100 inline-flex items-center gap-1"
        >
          View full report →
        </Link>
      )}
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
  if (t === "task_end") return <div className="text-blue-400">{text}</div>;
  if (t === "system") return <div className="text-purple-400 italic">{text}</div>;
  if (t === "error" || t === "error_line")
    return (
      <div className="text-red-400">
        {"message" in msg ? (msg as { message: string }).message : text}
      </div>
    );
  if (t === "output" && text.trim()) return <div className="text-zinc-400">{text}</div>;
  return null;
}
