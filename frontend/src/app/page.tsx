"use client";

import { useEffect, useState } from "react";

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
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selected, setSelected] = useState<Commit | null>(null);
  const [streamLog, setStreamLog] = useState<StreamMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [branches, setBranches] = useState<{ current: string; all: string[] }>({
    current: "main",
    all: ["main"],
  });
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [forkName, setForkName] = useState("");
  const [forkBusy, setForkBusy] = useState(false);
  const [revertBusy, setRevertBusy] = useState(false);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

  const refreshLog = async () => {
    const res = await fetch(`${API_BASE}/api/log`);
    const data = await res.json();
    setCommits(data.commits ?? []);
  };

  const refreshBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/branches`);
      const data = await res.json();
      setBranches({ current: data.current, all: data.all });
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }
  };

  useEffect(() => {
    refreshLog();
    refreshBranches();
  }, []);

  const forkAgent = async () => {
    const trimmed = forkName.trim();
    if (!trimmed) return;
    setForkBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/fork`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Fork failed: ${err.detail ?? res.statusText}`);
        return;
      }
      setForkDialogOpen(false);
      setForkName("");
      await refreshBranches();
      await refreshLog();
    } finally {
      setForkBusy(false);
    }
  };

  const switchBranch = async (branch: string) => {
    if (branch === branches.current) return;
    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ branch }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Checkout failed: ${err.detail ?? res.statusText}`);
        return;
      }
      await refreshBranches();
      await refreshLog();
      setSelected(null);
    } catch (e) {
      alert(`Checkout error: ${String(e)}`);
    }
  };

  const revertCommit = async () => {
    if (!selected) return;
    const reason = window.prompt(
      `Revert commit ${selected.shortHash}?\n\n"${selected.subject}"\n\nOptional reason (captured in the revert commit message):`,
      "",
    );
    if (reason === null) return; // user cancelled
    setRevertBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/revert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          commit_hash: selected.hash,
          reason: reason || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Revert failed: ${err.detail ?? res.statusText}`);
        return;
      }
      await refreshLog();
      setSelected(null);
    } finally {
      setRevertBusy(false);
    }
  };

  const runSession = async () => {
    if (!prompt.trim()) return;
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
            // skip malformed JSON (partial line during streaming)
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono text-sm">
      {/* Top bar */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">
            Portfolio Council
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            powered by gitclaw
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {/* Branch switcher = git checkout */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">branch:</span>
            <select
              value={branches.current}
              onChange={(e) => switchBranch(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer"
              title="git checkout"
            >
              {branches.all.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Fork Agent = git checkout -b */}
          <button
            onClick={() => setForkDialogOpen(true)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-200 transition"
            title="git checkout -b <name>"
          >
            + Fork Agent
          </button>

          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">{commits.length} sessions</span>
        </div>
      </header>

      {/* Fork dialog */}
      {forkDialogOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => !forkBusy && setForkDialogOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-[440px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">Fork Agent</h2>
            <p className="text-xs text-zinc-400 mb-4">
              Creates a new git branch from current HEAD. Same agent code,
              independent decision history. Try{" "}
              <code className="text-zinc-300">aggressive-me</code> or{" "}
              <code className="text-zinc-300">tax-aware</code>.
            </p>
            <input
              type="text"
              autoFocus
              value={forkName}
              onChange={(e) => setForkName(e.target.value)}
              placeholder="branch name (e.g. aggressive-me)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-zinc-600 mb-4"
              onKeyDown={(e) => {
                if (e.key === "Enter") forkAgent();
                if (e.key === "Escape") setForkDialogOpen(false);
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setForkDialogOpen(false)}
                disabled={forkBusy}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={forkAgent}
                disabled={forkBusy || !forkName.trim()}
                className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded font-semibold"
              >
                {forkBusy ? "Creating…" : "git checkout -b"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-56px)]">
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-base">{selected.subject}</h2>
                    <div className="mt-1 text-xs text-zinc-500">
                      {selected.author} · {new Date(selected.date).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={revertCommit}
                    disabled={revertBusy}
                    className="shrink-0 px-2.5 py-1 text-xs bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded text-red-300 disabled:opacity-50 transition"
                    title="git revert"
                  >
                    {revertBusy ? "Reverting…" : "↶ Revert decision"}
                  </button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap text-xs text-zinc-300 leading-relaxed">
                  {selected.body || "(no body)"}
                </pre>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
                    Prompt (sent to gitclaw)
                  </label>
                  <textarea
                    className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    placeholder="e.g. Run a portfolio review for today."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={running}
                  />
                </div>
                <button
                  onClick={runSession}
                  disabled={running || !prompt.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded text-sm font-semibold transition"
                >
                  {running ? "Running…" : "▶ Run via gitclaw"}
                </button>
                <div className="text-xs text-zinc-500">
                  This calls gitclaw&apos;s SDK directly. Each event in the
                  Live Activity panel is one agent action.
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
                idle — run a session to see agent activity
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
