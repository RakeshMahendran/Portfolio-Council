"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AgentPanel } from "@/components/AgentPanel";
import { streamRun, stripAnsi } from "@/lib/api";
import type { AgentId, AgentStatus, StreamMsg } from "@/lib/types";

const DEFAULT_PROMPT = "Run a complete portfolio review session for today.";

const AGENT_ORDER: AgentId[] = ["analyst", "strategist", "risk", "execution"];

const DISPLAY_NAME: Record<AgentId, string> = {
  analyst: "Analyst",
  strategist: "Strategist",
  risk: "Risk Officer",
  execution: "Execution",
};

type AgentState = {
  status: AgentStatus;
  events: StreamMsg[];
  verdict?: "APPROVE" | "VETO" | "AMEND";
  summary?: string;
};

const INITIAL_AGENTS: Record<AgentId, AgentState> = {
  analyst: { status: "idle", events: [] },
  strategist: { status: "idle", events: [] },
  risk: { status: "idle", events: [] },
  execution: { status: "idle", events: [] },
};

// ───────────────────────────────────────────────────────────────────────────
// Page (wrapped in Suspense because useSearchParams requires it in Next 16)
// ───────────────────────────────────────────────────────────────────────────

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-400 grid place-items-center">
          loading session…
        </div>
      }
    >
      <SessionInner />
    </Suspense>
  );
}

function SessionInner() {
  const searchParams = useSearchParams();
  const urlPrompt = searchParams.get("prompt") ?? "";

  const [agents, setAgents] = useState<Record<AgentId, AgentState>>(
    () => structuredClone(INITIAL_AGENTS),
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vetoReason, setVetoReason] = useState<string | null>(null);

  // Use a ref for the routing state machine — avoids React batching surprises
  // when many stream events arrive per frame.
  const currentAgentRef = useRef<AgentId | null>(null);
  const startedRef = useRef(false);

  // Update a single agent immutably.
  const patchAgent = useCallback(
    (id: AgentId, patch: Partial<AgentState>) => {
      setAgents((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    [],
  );

  const appendEvent = useCallback(
    (id: AgentId, msg: StreamMsg) => {
      setAgents((prev) => ({
        ...prev,
        [id]: { ...prev[id], events: [...prev[id].events, msg] },
      }));
    },
    [],
  );

  const setCurrentAgent = useCallback(
    (id: AgentId | null, opts?: { completePrior?: boolean }) => {
      const prior = currentAgentRef.current;
      if (opts?.completePrior && prior && prior !== id) {
        patchAgent(prior, { status: "complete" });
      }
      currentAgentRef.current = id;
      if (id) {
        // Only flip to running if not already complete/failed.
        setAgents((prev) => {
          const cur = prev[id];
          if (cur.status === "complete" || cur.status === "failed") return prev;
          return { ...prev, [id]: { ...cur, status: "running" } };
        });
      }
    },
    [patchAgent],
  );

  // ─── The main runner ──────────────────────────────────────────────────────
  const startRun = useCallback(
    async (prompt: string) => {
      if (running) return;
      setRunning(true);
      setDone(false);
      setError(null);
      setVetoReason(null);
      setAgents(structuredClone(INITIAL_AGENTS));
      currentAgentRef.current = null;

      try {
        for await (const msg of streamRun(prompt)) {
          // Heuristic routing — see notes at bottom of file.
          routeMessage(msg, {
            currentAgentRef,
            setCurrentAgent,
            appendEvent,
            patchAgent,
            setVetoReason,
          });

          // Terminal events
          if (msg.type === "session_end") {
            // Mark whatever was running as complete.
            const cur = currentAgentRef.current;
            if (cur) patchAgent(cur, { status: "complete" });
            setDone(true);
            if (msg.return_code !== 0) {
              setError(`session ended with exit code ${msg.return_code}`);
              if (cur) patchAgent(cur, { status: "failed" });
            }
          }

          if (msg.type === "error") {
            setError(msg.message);
            const cur = currentAgentRef.current;
            if (cur) patchAgent(cur, { status: "failed" });
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setRunning(false);
        setDone(true);
      }
    },
    [running, appendEvent, patchAgent, setCurrentAgent],
  );

  // Auto-start when prompt is in URL.
  useEffect(() => {
    if (urlPrompt && !startedRef.current) {
      startedRef.current = true;
      startRun(urlPrompt);
    }
  }, [urlPrompt, startRun]);

  const showStartScreen = !urlPrompt && !running && !done;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/80 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-200 transition text-sm"
          >
            ← back
          </Link>
          <div className="h-5 w-px bg-zinc-800" />
          <div>
            <div className="font-sans text-base font-semibold tracking-tight">
              Portfolio Review
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 mt-0.5">
              {running
                ? "session in progress"
                : done
                  ? "session complete"
                  : "ready"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <SessionPulse running={running} />
          <span>{new Date().toLocaleString()}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {showStartScreen ? (
          <StartScreen onStart={() => startRun(DEFAULT_PROMPT)} />
        ) : (
          <>
            {/* Veto banner */}
            {agents.risk.verdict === "VETO" && (
              <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="text-red-400 text-lg leading-none mt-0.5">
                    ⚠
                  </span>
                  <div>
                    <div className="font-semibold text-red-200 text-sm">
                      Risk Officer issued a VETO
                    </div>
                    <div className="text-xs text-red-300/80 mt-1 leading-relaxed">
                      {vetoReason ??
                        "The proposed rebalance was blocked. Execution will not run for this session."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* 2x2 grid of agent panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {AGENT_ORDER.map((id) => (
                <AgentPanel
                  key={id}
                  agentId={id}
                  displayName={DISPLAY_NAME[id]}
                  status={agents[id].status}
                  events={agents[id].events}
                  verdict={id === "risk" ? agents.risk.verdict : undefined}
                  summary={agents[id].summary}
                />
              ))}
            </div>

            {/* Footer: final report link */}
            {done && !error && (
              <div className="mt-8 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-100">
                    {agents.risk.verdict === "VETO"
                      ? "Session blocked by Risk"
                      : "Session committed to git"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    The orchestrator has recorded this session.
                  </div>
                </div>
                <Link
                  href="/"
                  className="text-sm px-4 py-2 rounded border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/60 transition"
                >
                  View final report →
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Start screen — shown when no prompt in URL and not yet running
// ───────────────────────────────────────────────────────────────────────────

function StartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid place-items-center min-h-[60vh]">
      <div className="text-center max-w-lg">
        <div className="text-xs uppercase tracking-[0.22em] text-zinc-500 mb-3">
          Portfolio Council
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
          Convene the panel
        </h1>
        <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
          Four agents — Analyst, Strategist, Risk Officer, Execution — will
          debate your portfolio in sequence. You&apos;ll see each one think,
          challenge, and commit in real time.
        </p>
        <button
          onClick={onStart}
          className="mt-8 px-6 py-3 rounded-lg bg-zinc-100 text-zinc-900 font-semibold text-sm hover:bg-white transition shadow-lg shadow-zinc-100/10"
        >
          ▶ Run portfolio review
        </button>
      </div>
    </div>
  );
}

function SessionPulse({ running }: { running: boolean }) {
  if (!running) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-amber-300">
      <span className="relative inline-flex w-2 h-2">
        <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-60" />
        <span className="relative w-2 h-2 rounded-full bg-amber-400" />
      </span>
      live
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Event routing — the state machine
// ───────────────────────────────────────────────────────────────────────────
//
// The orchestrator emits a mix of `output` (its own narrative) and `tool_use`
// (e.g. `task_tracker(...)`, `cli(command: ... gitclaw --di...)`) lines.
//
// Transition rules:
//   1. A line matching "Delegate to <Agent>" or "Step N:" with an agent name
//      → switch currentAgent to that agent (and mark prior agent complete).
//   2. A `task_tracker(action: update, step: ...)` line with an agent name
//      sets that agent's summary.
//   3. "Step N recorded" / "Step N recorded:" → mark currentAgent complete.
//   4. Anywhere a "**VETO**" / "**APPROVE**" / "**AMEND**" appears while
//      currentAgent === "risk", parse it as the verdict.
//   5. A `cli(command: ... gitclaw --di...)` tool_use ALSO confirms the
//      current sub-agent is now executing (used as a secondary signal).
//
// Everything else is attached to whichever agent is currently active.

type Router = {
  currentAgentRef: React.MutableRefObject<AgentId | null>;
  setCurrentAgent: (id: AgentId | null, opts?: { completePrior?: boolean }) => void;
  appendEvent: (id: AgentId, msg: StreamMsg) => void;
  patchAgent: (id: AgentId, patch: Partial<AgentState>) => void;
  setVetoReason: (reason: string | null) => void;
};

function routeMessage(msg: StreamMsg, r: Router) {
  const text =
    "text" in msg
      ? stripAnsi(msg.text)
      : "message" in msg
        ? msg.message
        : "";

  // Detect agent transitions from any text-bearing message.
  const transition = detectTransition(text);
  if (transition) {
    r.setCurrentAgent(transition, { completePrior: true });
  }

  // Detect "Step N recorded" → complete the current agent.
  if (/Step\s+\d+\s+recorded/i.test(text)) {
    const cur = r.currentAgentRef.current;
    if (cur) r.patchAgent(cur, { status: "complete" });
  }

  // Parse summary from task_tracker(action: update, step: N, ...)
  const summary = parseTrackerSummary(text);
  if (summary) {
    const target = summary.agent ?? r.currentAgentRef.current;
    if (target) r.patchAgent(target, { summary: summary.text });
  }

  // Parse risk verdict.
  if (r.currentAgentRef.current === "risk") {
    const verdict = parseVerdict(text);
    if (verdict) {
      r.patchAgent("risk", { verdict });
      if (verdict === "VETO") {
        const reason = extractVetoReason(text);
        if (reason) r.setVetoReason(reason);
      }
    }
  }

  // Attach the event to whoever is currently speaking. If no agent is active
  // yet (e.g. orchestrator preamble), we drop the event from the panel grid
  // since the panels only show sub-agent activity.
  const cur = r.currentAgentRef.current;
  if (cur) r.appendEvent(cur, msg);
}

/** Look for "Delegate to <Agent>" or "Step N:" patterns. */
function detectTransition(text: string): AgentId | null {
  // "## Step 1: Delegate to Analyst" / "Delegate to Strategist" / etc.
  const delegate = text.match(
    /Delegate to\s+(Analyst|Strategist|Risk(?:\s+Officer)?|Execution)/i,
  );
  if (delegate) return normalizeAgent(delegate[1]);

  // "## Step 1: Analyst" style headings
  const stepHeading = text.match(
    /^#{1,3}\s*Step\s+\d+\s*[:\-–]\s*(Analyst|Strategist|Risk(?:\s+Officer)?|Execution)/i,
  );
  if (stepHeading) return normalizeAgent(stepHeading[1]);

  // Bare role mentions in tool_use lines like
  // "▶ cli(command: cd agents/analyst && gitclaw --di...)"
  const cliCmd = text.match(
    /agents\/(analyst|strategist|risk|execution)\b/i,
  );
  if (cliCmd) return normalizeAgent(cliCmd[1]);

  // task_tracker step descriptions like
  // "task_tracker(action: update, step: 2, status: in_progress, note: 'Strategist running')"
  const trackerNote = text.match(
    /task_tracker\([^)]*\b(Analyst|Strategist|Risk(?:\s+Officer)?|Execution)\b/i,
  );
  if (trackerNote) return normalizeAgent(trackerNote[1]);

  return null;
}

function normalizeAgent(raw: string): AgentId {
  const lower = raw.toLowerCase();
  if (lower.startsWith("analyst")) return "analyst";
  if (lower.startsWith("strateg")) return "strategist";
  if (lower.startsWith("risk")) return "risk";
  if (lower.startsWith("exec")) return "execution";
  return "analyst";
}

/**
 * Extract a one-line summary from a task_tracker update line, e.g.
 *   task_tracker(action: update, step: 1, note: "Analyst captured 4 risks")
 */
function parseTrackerSummary(
  text: string,
): { agent: AgentId | null; text: string } | null {
  if (!/task_tracker\(/.test(text)) return null;
  if (!/action:\s*update/i.test(text)) return null;

  // Grab the `note: "..."` payload if present.
  const noteMatch = text.match(/note:\s*["']([^"']+)["']/i);
  if (!noteMatch) return null;
  const note = noteMatch[1];

  // Try to attribute by agent name inside the note.
  const agentMatch = note.match(
    /\b(Analyst|Strategist|Risk(?:\s+Officer)?|Execution)\b/i,
  );
  return {
    agent: agentMatch ? normalizeAgent(agentMatch[1]) : null,
    text: note,
  };
}

function parseVerdict(text: string): "APPROVE" | "VETO" | "AMEND" | null {
  // Prefer the bolded markdown form first (more authoritative).
  if (/\*\*VETO\*\*/.test(text)) return "VETO";
  if (/\*\*APPROVE\*\*/.test(text)) return "APPROVE";
  if (/\*\*AMEND\*\*/.test(text)) return "AMEND";
  // Fallback to bare keywords on their own — only when prefixed with a
  // verdict-y context to reduce false positives.
  if (/\bVerdict:\s*VETO\b/i.test(text)) return "VETO";
  if (/\bVerdict:\s*APPROVE\b/i.test(text)) return "APPROVE";
  if (/\bVerdict:\s*AMEND\b/i.test(text)) return "AMEND";
  return null;
}

function extractVetoReason(text: string): string | null {
  // Common shapes:
  //   "**VETO** — concentration breach on RELIANCE"
  //   "VETO: position size exceeds RULES.md cap"
  const m =
    text.match(/\*\*VETO\*\*\s*[—\-:]\s*(.+)/i) ??
    text.match(/\bVETO\b\s*[:\-]\s*(.+)/i);
  if (m) return m[1].trim().slice(0, 240);
  return null;
}
