"use client";

import { useEffect, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";

// ─────────────────────────────────────────────────────────────────────────
// PROPERLY TYPED API RESPONSES — matches server/git_ops.py output exactly
// ─────────────────────────────────────────────────────────────────────────

type Commit = {
  hash: string;
  shortHash: string;
  subject: string;
  author: string;
  date: string;
  body: string;
  isGitclawAuthored: boolean;
  isRebalance: boolean;
};

// Discriminated union for stream events — type-safe handling of all variants
type StreamMsg =
  | { type: "session_start"; agent_dir: string }
  | { type: "output"; text: string }
  | { type: "tool_use"; text: string }
  | { type: "error_line"; text: string }
  | { type: "task_end"; text: string }
  | { type: "system"; text: string }
  | { type: "error"; message: string }
  | { type: "session_end"; return_code: number };

// ─────────────────────────────────────────────────────────────────────────
// CANONICAL ACTIONS — common portfolio operations
// ─────────────────────────────────────────────────────────────────────────

type CanonicalAction = {
  id: string;
  label: string;
  prompt: string;
  description: string;
  icon: string;
  color: string;
};

const CANONICAL_ACTIONS: CanonicalAction[] = [
  {
    id: "review",
    label: "Run portfolio review",
    prompt: "Run a complete portfolio review session for today.",
    description: "Full analysis → strategy → risk review → execution plan",
    icon: "📊",
    color: "emerald",
  },
  {
    id: "goal",
    label: "Check goal progress",
    prompt: "Check my progress toward the ₹40L goal by May 2027. Show projected vs required returns.",
    description: "Compare current trajectory with target milestone",
    icon: "🎯",
    color: "blue",
  },
  {
    id: "holdings",
    label: "Analyze holdings",
    prompt: "Analyze current holdings from data/holdings.json. Show concentration, P/L, and sector breakdown.",
    description: "Quick snapshot of portfolio health",
    icon: "📈",
    color: "amber",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selected, setSelected] = useState<Commit | null>(null);
  const [streamLog, setStreamLog] = useState<StreamMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  const refreshLog = async () => {
    const res = await fetch(`${API_BASE}/api/log`);
    const data = await res.json();
    setCommits(data.commits ?? []);
  };

  useEffect(() => {
    refreshLog();
  }, []);

  const runWithPrompt = async (prompt: string) => {
    setRunning(true);
    setStreamLog([]);

    try {
      const res = await fetch(`${API_BASE}/api/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.body) {
        setStreamLog([{ type: "error", message: "No response body" }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as StreamMsg;
            setStreamLog((prev) => [...prev, msg]);
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      setStreamLog((prev) => [
        ...prev,
        { type: "error", message: String(err) },
      ]);
    } finally {
      setRunning(false);
      refreshLog();
    }
  };

  const runAction = (action: CanonicalAction) => {
    runWithPrompt(action.prompt);
  };

  const runCustomPrompt = () => {
    if (!customPrompt.trim()) return;
    runWithPrompt(customPrompt);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono text-sm">
      <SiteHeader
        backHref="/"
        pageContext={
          <>
            <span className="text-sm text-zinc-400 font-sans">Developer view</span>
            <span className="text-xs text-zinc-600 font-mono">·</span>
            <StatusBadge variant="info">branch: main</StatusBadge>
            <span className="text-xs text-zinc-500 font-mono">
              {commits.length} commits
            </span>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-80px)]">
        {/* LEFT: Session list (= git log) */}
        <aside className="col-span-3 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
            Sessions (git log)
          </div>
          <div className="overflow-y-auto flex-1">
            {commits.map((c) => (
              <button
                key={c.hash}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-3 py-2 border-b border-zinc-900 hover:bg-zinc-900 transition ${
                  selected?.hash === c.hash ? "bg-zinc-900" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-xs">{c.shortHash}</span>
                  {c.isRebalance && (
                    <span className="text-xs px-1.5 rounded bg-emerald-900/60 text-emerald-300">
                      rebalance
                    </span>
                  )}
                  {c.isGitclawAuthored && (
                    <span className="text-xs px-1.5 rounded bg-blue-900/60 text-blue-300">
                      gitclaw
                    </span>
                  )}
                </div>
                <div className="text-xs mt-1 text-zinc-300 line-clamp-2">
                  {c.subject}
                </div>
                <div className="text-[10px] mt-1 text-zinc-600">
                  {new Date(c.date).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER: Session detail OR Run prompt */}
        <main className="col-span-6 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>{selected ? `commit ${selected.shortHash}` : "run session"}</span>
            {selected && (
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-400 hover:text-zinc-100 text-xs"
              >
                ✕ close
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-4">
            {selected ? (
              <div>
                <h2 className="font-semibold text-base">{selected.subject}</h2>
                <div className="mt-1 text-xs text-zinc-500">
                  {selected.author} · {new Date(selected.date).toLocaleString()}
                </div>
                <pre className="mt-4 whitespace-pre-wrap text-xs text-zinc-300 leading-relaxed">
                  {selected.body || "(no body)"}
                </pre>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Canonical Actions */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-3">
                    Quick actions
                  </label>
                  <div className="space-y-3">
                    {CANONICAL_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => runAction(action)}
                        disabled={running}
                        className={`w-full text-left p-4 rounded-lg border transition ${
                          action.color === "emerald"
                            ? "bg-emerald-950/30 border-emerald-900/50 hover:bg-emerald-950/50 hover:border-emerald-800"
                            : action.color === "blue"
                            ? "bg-blue-950/30 border-blue-900/50 hover:bg-blue-950/50 hover:border-blue-800"
                            : "bg-amber-950/30 border-amber-900/50 hover:bg-amber-950/50 hover:border-amber-800"
                        } disabled:opacity-50 disabled:cursor-not-allowed group`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0 mt-0.5">{action.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-zinc-100 group-hover:text-zinc-50">
                              {action.label}
                            </div>
                            <div className="text-xs text-zinc-400 mt-1 leading-relaxed">
                              {action.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible Custom Prompt */}
                <div className="pt-2 border-t border-zinc-800">
                  <button
                    onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded transition"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">
                        {showCustomPrompt ? "▼" : "▶"}
                      </span>
                      <span className="uppercase tracking-wider">
                        Advanced: Custom prompt
                      </span>
                    </span>
                    <span className="text-zinc-600">
                      {showCustomPrompt ? "Hide" : "Show"}
                    </span>
                  </button>

                  {showCustomPrompt && (
                    <div className="mt-3 space-y-3 px-1">
                      <textarea
                        className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                        placeholder="e.g. Compare my portfolio with NIFTY 50 returns over the last 6 months."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        disabled={running}
                      />
                      <button
                        onClick={runCustomPrompt}
                        disabled={running || !customPrompt.trim()}
                        className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-sm font-semibold transition"
                      >
                        {running ? "Running…" : "▶ Run custom prompt"}
                      </button>
                      <div className="text-xs text-zinc-500 leading-relaxed">
                        Use custom prompts for advanced queries not covered by quick actions.
                        The agent has full context and can handle any portfolio-related question.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                  Each action runs gitclaw with a specific prompt. Watch the Live Activity
                  panel (right) to see the agent&apos;s work in real-time.
                </div>
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: Live activity stream */}
        <aside className="col-span-3 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Live activity</span>
            {streamLog.length > 0 && (
              <span className="text-zinc-600">{streamLog.length} events</span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-1.5 text-xs">
            {streamLog.length === 0 && (
              <div className="text-zinc-600 italic">
                idle — choose an action to see agent activity
              </div>
            )}
            {streamLog.map((msg, i) => (
              <StreamEvent key={i} msg={msg} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STREAM EVENT RENDERER — Type-safe handling with discriminated union
// ─────────────────────────────────────────────────────────────────────────

// Strip ANSI escape sequences (\x1b[...m, \x1b[K, etc.)
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

function StreamEvent({ msg }: { msg: StreamMsg }) {
  // TypeScript now knows exactly which properties exist for each type!
  switch (msg.type) {
    case "session_start":
      return (
        <div className="text-emerald-500 font-semibold border-l-2 border-emerald-500 pl-2 my-1">
          ▶ session start
          <div className="text-[10px] text-zinc-600 mt-0.5">
            {msg.agent_dir}
          </div>
        </div>
      );

    case "session_end":
      return (
        <div className="text-emerald-500 font-semibold border-l-2 border-emerald-500 pl-2 my-1">
          ✓ session end (exit {msg.return_code})
        </div>
      );

    case "tool_use":
      return (
        <div className="text-amber-400 font-medium">
          {stripAnsi(msg.text)}
        </div>
      );

    case "task_end":
      return (
        <div className="text-blue-400">
          {stripAnsi(msg.text)}
        </div>
      );

    case "system":
      return (
        <div className="text-purple-400 italic">
          {stripAnsi(msg.text)}
        </div>
      );

    case "error_line":
      return (
        <div className="text-red-400">
          {stripAnsi(msg.text)}
        </div>
      );

    case "error":
      return (
        <div className="text-red-400 font-semibold">
          ✗ {msg.message}
        </div>
      );

    case "output": {
      // Default agent output — most common type. Skip empty lines.
      const text = stripAnsi(msg.text);
      if (!text.trim()) return null;
      return <div className="text-zinc-300 whitespace-pre-wrap">{text}</div>;
    }

    default:
      // TypeScript ensures this is unreachable (exhaustiveness check)
      const _exhaustive: never = msg;
      return null;
  }
}
