"use client";

import clsx from "clsx";
import { useEffect, useRef } from "react";
import { stripAnsi } from "@/lib/api";
import type { AgentId, AgentStatus, StreamMsg } from "@/lib/types";

export type AgentPanelProps = {
  agentId: AgentId;
  displayName: string;
  status: AgentStatus;
  events: StreamMsg[];
  /** Only meaningful for the Risk agent. */
  verdict?: "APPROVE" | "VETO" | "AMEND";
  /** One-line summary shown at the bottom once the agent is complete. */
  summary?: string;
};

/**
 * A single agent card in the Portfolio Council live panel.
 *
 * Visual states:
 *  - idle     → dim gray, "waiting…"
 *  - running  → pulsing accent border, spinner, latest events scroll
 *  - complete → green check, full scrollable log, summary visible
 *  - failed   → red X, error visible
 */
export function AgentPanel({
  agentId,
  displayName,
  status,
  events,
  verdict,
  summary,
}: AgentPanelProps) {
  // Accent color per agent — keeps each panel distinguishable.
  const accent = ACCENTS[agentId];

  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the log to the latest event while running.
  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events.length]);

  const borderClass = clsx(
    "rounded-xl border bg-zinc-900/40 backdrop-blur-sm",
    "flex flex-col overflow-hidden transition-colors duration-300",
    "min-h-[280px]",
    status === "idle" && "border-zinc-800 opacity-70",
    status === "running" &&
      `border-${accent}-500/60 animate-pulse-border shadow-[0_0_30px_-12px] shadow-${accent}-500/40`,
    status === "complete" && "border-emerald-700/60",
    status === "failed" && "border-red-700/60",
  );

  // Tailwind 4 can't always JIT dynamic class names — use inline ring style
  // for the running glow so it always renders.
  const runningStyle =
    status === "running"
      ? { boxShadow: `0 0 30px -12px ${ACCENT_HEX[agentId]}66` }
      : undefined;

  return (
    <div className={borderClass} style={runningStyle}>
      {/* Top row: name + status + verdict */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} accent={accent} />
          <div>
            <div className="font-sans text-sm font-semibold tracking-tight text-zinc-100">
              {displayName}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {agentId}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agentId === "risk" && verdict && <VerdictBadge verdict={verdict} />}
          <StatusLabel status={status} />
        </div>
      </div>

      {/* Middle: rolling event log */}
      <div
        ref={logRef}
        className={clsx(
          "flex-1 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed",
          "space-y-1 min-h-[120px] max-h-[260px]",
        )}
      >
        {status === "idle" && events.length === 0 && (
          <div className="text-zinc-600 italic font-sans text-xs">
            waiting for orchestrator…
          </div>
        )}
        {status === "failed" && events.length === 0 && (
          <div className="text-red-400 font-sans text-xs">agent failed</div>
        )}
        {events.slice(-12).map((e, i) => (
          <EventLine key={i} msg={e} accent={accent} />
        ))}
      </div>

      {/* Bottom: summary */}
      {summary && status === "complete" && (
        <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-950/40">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1">
            Summary
          </div>
          <div className="text-xs text-zinc-200 leading-relaxed font-sans">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

function StatusDot({
  status,
  accent,
}: {
  status: AgentStatus;
  accent: AccentName;
}) {
  if (status === "idle") {
    return <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block" />;
  }
  if (status === "running") {
    return (
      <span className="relative inline-flex w-2.5 h-2.5">
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ backgroundColor: ACCENT_HEX_BY_NAME[accent], opacity: 0.5 }}
        />
        <span
          className="relative w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: ACCENT_HEX_BY_NAME[accent] }}
        />
      </span>
    );
  }
  if (status === "complete") {
    return (
      <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 text-[10px]">
        ✓
      </span>
    );
  }
  // failed
  return (
    <span className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/60 flex items-center justify-center text-red-400 text-[10px]">
      ✕
    </span>
  );
}

function StatusLabel({ status }: { status: AgentStatus }) {
  const map: Record<AgentStatus, { label: string; cls: string }> = {
    idle: { label: "idle", cls: "text-zinc-500 bg-zinc-800/60" },
    running: {
      label: "running",
      cls: "text-amber-300 bg-amber-500/10 border border-amber-500/30",
    },
    complete: {
      label: "done",
      cls: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/30",
    },
    failed: {
      label: "failed",
      cls: "text-red-300 bg-red-500/10 border border-red-500/30",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={clsx(
        "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-sans",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: "APPROVE" | "VETO" | "AMEND" }) {
  const map = {
    APPROVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    VETO: "bg-red-500/15 text-red-300 border-red-500/40",
    AMEND: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  } as const;
  return (
    <span
      className={clsx(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border font-sans",
        map[verdict],
      )}
    >
      {verdict}
    </span>
  );
}

function EventLine({ msg, accent }: { msg: StreamMsg; accent: AccentName }) {
  // Render a compact single line that fits the panel.
  switch (msg.type) {
    case "tool_use": {
      const text = stripAnsi(msg.text).replace(/^▶\s*/, "");
      return (
        <div className="text-amber-300/90 truncate" title={text}>
          <span className="text-amber-500">▶</span> {text}
        </div>
      );
    }
    case "task_end":
      return (
        <div className="text-blue-300/90 truncate" title={stripAnsi(msg.text)}>
          {stripAnsi(msg.text)}
        </div>
      );
    case "system":
      return (
        <div
          className="text-purple-300/80 italic truncate"
          title={stripAnsi(msg.text)}
        >
          {stripAnsi(msg.text)}
        </div>
      );
    case "error_line":
    case "error":
      return (
        <div className="text-red-400 truncate">
          {stripAnsi("message" in msg ? msg.message : msg.text)}
        </div>
      );
    case "session_start":
      return (
        <div className="text-emerald-400/80 truncate">
          ▶ session: {msg.agent_dir}
        </div>
      );
    case "session_end":
      return (
        <div className="text-emerald-400/80 truncate">
          ✓ session ended ({msg.return_code})
        </div>
      );
    case "output": {
      const text = stripAnsi(msg.text).trim();
      if (!text) return null;
      // Highlight markdown headings for narrative readability.
      if (text.startsWith("##") || text.startsWith("#")) {
        return (
          <div
            className="font-semibold truncate"
            style={{ color: ACCENT_HEX_BY_NAME[accent] }}
            title={text}
          >
            {text.replace(/^#+\s*/, "")}
          </div>
        );
      }
      return (
        <div className="text-zinc-300/90 truncate" title={text}>
          {text}
        </div>
      );
    }
    default:
      return null;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Accent palette — one color per agent
// ───────────────────────────────────────────────────────────────────────────

type AccentName = "sky" | "violet" | "rose" | "emerald";

const ACCENTS: Record<AgentId, AccentName> = {
  analyst: "sky",
  strategist: "violet",
  risk: "rose",
  execution: "emerald",
};

// Hex equivalents for inline styles (Tailwind JIT can't pick up dynamic
// `border-${accent}-500` classes reliably across builds).
const ACCENT_HEX_BY_NAME: Record<AccentName, string> = {
  sky: "#38bdf8",
  violet: "#a78bfa",
  rose: "#fb7185",
  emerald: "#34d399",
};

const ACCENT_HEX: Record<AgentId, string> = {
  analyst: ACCENT_HEX_BY_NAME.sky,
  strategist: ACCENT_HEX_BY_NAME.violet,
  risk: ACCENT_HEX_BY_NAME.rose,
  execution: ACCENT_HEX_BY_NAME.emerald,
};

export default AgentPanel;
