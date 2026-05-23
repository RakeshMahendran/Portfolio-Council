"use client";

import { useEffect, useState } from "react";

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

type StreamMsg = {
  type: string;
  [key: string]: unknown;
};

export default function Dashboard() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selected, setSelected] = useState<Commit | null>(null);
  const [streamLog, setStreamLog] = useState<StreamMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState("");

  const refreshLog = async () => {
    const res = await fetch("/api/log");
    const data = await res.json();
    setCommits(data.commits ?? []);
  };

  useEffect(() => {
    refreshLog();
  }, []);

  const runSession = async () => {
    if (!prompt.trim()) return;
    setRunning(true);
    setStreamLog([]);

    try {
      const res = await fetch("/api/run", {
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
            // skip malformed
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
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>branch: main</span>
          <span>·</span>
          <span>{commits.length} sessions</span>
        </div>
      </header>

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

function StreamEvent({ msg }: { msg: StreamMsg }) {
  const t = msg.type;
  if (t === "delta") {
    return (
      <span className="text-zinc-300">
        {String((msg as { content?: string }).content ?? "")}
      </span>
    );
  }
  if (t === "tool_use") {
    return (
      <div className="text-amber-400">
        ▶ {String((msg as { toolName?: string }).toolName ?? "tool")}
      </div>
    );
  }
  if (t === "tool_result") {
    return <div className="text-zinc-500 truncate">  └ ok</div>;
  }
  if (t === "session_start") {
    return <div className="text-emerald-500">[session start]</div>;
  }
  if (t === "session_end") {
    return <div className="text-emerald-500">[session end]</div>;
  }
  if (t === "error") {
    return (
      <div className="text-red-400">
        ✗ {String((msg as { message?: string }).message ?? "error")}
      </div>
    );
  }
  if (t === "assistant") {
    return <div className="text-blue-400">[assistant turn complete]</div>;
  }
  return <div className="text-zinc-600">[{t}]</div>;
}
